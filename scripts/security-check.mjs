import { createHash } from 'node:crypto'
import assert from 'node:assert/strict'
import { access, readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import ts from 'typescript'

const projectRoot = process.cwd()
const requireOutput = process.argv.includes('--output')
const runSelfTest = process.argv.includes('--self-test')
const configuredBasePath = process.env.NEXT_PUBLIC_BASE_PATH ?? ''
const validBasePathPattern = /^\/[A-Za-z0-9._~-]+(?:\/[A-Za-z0-9._~-]+)*\/?$/
const expectedBasePath = configuredBasePath === '' || configuredBasePath === '/'
  ? ''
  : `/${configuredBasePath.replace(/^\/+|\/+$/g, '')}`
const appRoots = ['src', 'public']
const appExtensions = new Set(['.html', '.js', '.jsx', '.json', '.mjs', '.svg', '.ts', '.tsx'])
const ignoredDirectories = new Set(['.git', '.next', 'node_modules', 'out', 'logs'])

const retiredCredentialHashes = new Set([
  // SHA-256 only: retaining the revoked plaintext here would recreate the leak.
  '5755520164cac3c3fd5957bd48249ea21b88a4b9f36f924b54cb3847ecbc8be1',
])

const forbiddenAppPatterns = [
  { label: 'Soleas credential in client source', pattern: /SOLEAS_API_KEY|NEXT_PUBLIC_SOLEAS/ },
  { label: 'FormSubmit relay', pattern: /formsubmit\.co/i },
  {
    label: 'WhatsApp personal-data handoff',
    pattern: /wa\.me(?:\/|\?)|(?:api|web)\.whatsapp\.com\/send|whatsapp:\/\/send/i,
  },
  { label: 'HTML injection sink', pattern: /dangerouslySetInnerHTML|\.innerHTML\s*=/ },
  { label: 'obsolete service-worker cache', pattern: /drava-cache-v1/ },
  {
    label: 'external image host',
    pattern: /https?:\/\/(?:images\.unsplash\.com|source\.unsplash\.com|ext\.same-assets\.com|ugc\.same-assets\.com|cdn\.jsdelivr\.net\/gh\/lipis\/flag-icons)\b/i,
  },
  { label: 'payment API key field', pattern: /name=["']apiKey["']/i },
  {
    label: 'retired transaction marketing claim',
    pattern: /Paiements sans frontières|Your modern payment solution/i,
  },
  {
    label: 'financial or personal data in localStorage',
    pattern: /localStorage\.(?:getItem|setItem)\(\s*["'][^"']*(?:card|cvv|email|otp|pan|withdraw|code)/i,
  },
]

const highConfidenceSecretPatterns = [
  { label: 'private key', pattern: /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----/ },
  { label: 'AWS access key', pattern: /\bAKIA[0-9A-Z]{16}\b/ },
  { label: 'GitHub token', pattern: /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{50,})\b/ },
  { label: 'Stripe live secret', pattern: /\b(?:sk|rk)_live_[A-Za-z0-9]{20,}\b/ },
  { label: 'Slack token', pattern: /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/ },
  {
    label: 'hard-coded credential assignment',
    pattern: /(?:api[_-]?key|client[_-]?secret|password|secret|token)\s*[:=]\s*["'][A-Za-z0-9+/_=.~-]{20,}["']/i,
  },
]

const sensitiveEnvironmentNamePattern =
  /(?:^|_)(?:API_?KEY|ACCESS_?KEY|AUTH_?TOKEN|BEARER_?TOKEN|TOKEN|SECRET|SECRET_?KEY|PASSWORD|PASSWD|PRIVATE_?KEY|CLIENT_?SECRET)$/i

const environmentPlaceholderPattern =
  /^(?:\$\{?[A-Z_][A-Z0-9_]*\}?|<[^>]+>|(?:your|insert|replace)(?:[_ -](?:actual|real|the))?[_ -].+|change[_ -]?me(?:[_ -].*)?|example(?:[_ -].*)?|placeholder(?:[_ -].*)?|todo|unset|none|null|x{8,})$/i

const publicEnvironmentCredentialPattern =
  /\bNEXT_PUBLIC_[A-Z0-9_]*(?:API_?KEY|ACCESS_?KEY|AUTH_?TOKEN|BEARER_?TOKEN|TOKEN|SECRET|SECRET_?KEY|PASSWORD|PASSWD|PRIVATE_?KEY|CLIENT_?SECRET)\b/i

const forbiddenOutputPatterns = [
  { label: 'Soleas integration in production output', pattern: /soleas|soleaspay|mysoleas/i },
  { label: 'FormSubmit relay in production output', pattern: /formsubmit\.co/i },
  {
    label: 'WhatsApp personal-data handoff in production output',
    pattern: /wa\.me(?:\/|\?)|(?:api|web)\.whatsapp\.com\/send|whatsapp:\/\/send/i,
  },
  {
    label: 'sensitive NEXT_PUBLIC credential reference in production output',
    pattern: publicEnvironmentCredentialPattern,
  },
  {
    label: 'card-data collection field in production output',
    pattern: /\bcard_number\b|cardNumberPlaceholder|cvvPlaceholder/i,
  },
  {
    label: 'withdrawal state in production output',
    pattern: /withdrawalData|withdrawalHistory|dravaCards/i,
  },
  { label: 'source map reference in production output', pattern: /sourceMappingURL\s*=\s*[^\s]+\.map/i },
  {
    label: 'external image host in production output',
    pattern: /https?:\/\/(?:images\.unsplash\.com|source\.unsplash\.com|ext\.same-assets\.com|ugc\.same-assets\.com|cdn\.jsdelivr\.net\/gh\/lipis\/flag-icons)\b/i,
  },
]

const forbiddenPaths = [
  'src/app/admin/newsletter/page.tsx',
  'src/app/api/newsletter/route.ts',
  'src/components/providers/soleas-payment-provider.tsx',
  'src/components/ui/dialog-notes.tsx',
  'src/components/ui/whatsapp-chat.tsx',
  'src/lib/soleas-payment.ts',
]

const maintenancePages = [
  'src/app/balance/page.tsx',
  'src/app/cards/page.tsx',
  'src/app/payment-failure/page.tsx',
  'src/app/payment-success/page.tsx',
  'src/app/topup/page.tsx',
  'src/app/withdrawal/page.tsx',
]

const maintenanceRoutes = [
  'balance',
  'cards',
  'payment-failure',
  'payment-success',
  'topup',
  'withdrawal',
]

async function listFiles(directory, extensions, ignored = new Set()) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      if (!ignored.has(entry.name)) files.push(...await listFiles(absolutePath, extensions, ignored))
    } else if (extensions === null || extensions.has(path.extname(entry.name))) {
      files.push(absolutePath)
    }
  }

  return files
}

async function pathExists(relativePath) {
  try {
    await access(path.join(projectRoot, relativePath))
    return true
  } catch {
    return false
  }
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex')
}

function isProbablyBinary(contents) {
  return contents.subarray(0, 8192).includes(0)
}

function containsRetiredCredential(source) {
  const candidates = [
    ...source.matchAll(/["'`]([^"'`\r\n]{8,512})["'`]/g),
    ...source.matchAll(/[A-Za-z0-9+/_=-]{20,128}/g),
  ]

  return candidates.some((match) => retiredCredentialHashes.has(sha256(match[1] ?? match[0])))
}

function isEnvironmentFile(file) {
  return /^\.env(?:\.|$)/i.test(path.basename(file))
}

function normalizeEnvironmentValue(rawValue) {
  let value = rawValue.trim()
  if (['"', "'", '`'].includes(value[0])) {
    const closingQuote = value.lastIndexOf(value[0])
    if (closingQuote > 0) return value.slice(1, closingQuote)
  }
  return value.replace(/\s+#.*$/, '').trim()
}

function looksLikeConcreteSecret(value) {
  if (value.length < 16 || value.length > 4096) return false
  if (/\s/.test(value) || environmentPlaceholderPattern.test(value)) return false
  if (/^(?:https?|wss?):\/\//i.test(value)) return false
  return new Set(value).size >= 5
}

function findEnvironmentCredentials(source) {
  const credentials = []

  for (const [index, line] of source.split(/\r?\n/).entries()) {
    if (/^\s*(?:#|$)/.test(line)) continue
    const assignment = line.match(/^\s*(?:export\s+)?([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/i)
    if (!assignment || !sensitiveEnvironmentNamePattern.test(assignment[1])) continue

    const value = normalizeEnvironmentValue(assignment[2])
    if (!looksLikeConcreteSecret(value)) continue
    credentials.push({ key: assignment[1], line: index + 1, value })
  }

  return credentials
}

function findPublicProcessEnvironmentCredentials(environment) {
  return Object.entries(environment)
    .filter(([key, value]) => key.toUpperCase().startsWith('NEXT_PUBLIC_')
      && sensitiveEnvironmentNamePattern.test(key)
      && typeof value === 'string'
      && looksLikeConcreteSecret(value))
    .map(([key, value]) => ({ key, value }))
}

function matchingRules(source, rules) {
  return rules.filter((rule) => rule.pattern.test(source))
}

function selfTest() {
  const firstSecret = `aB3_${'cD4e'.repeat(6)}`
  const secondSecret = `9zY-${'8xWv'.repeat(6)}`
  const publicSecret = `pub_${'A7bC'.repeat(6)}`
  const envSource = [
    `API_KEY=${firstSecret}`,
    `export TOKEN='${secondSecret}'`,
    `NEXT_PUBLIC_PAYMENT_TOKEN=${publicSecret} # must never reach a browser bundle`,
    'API_KEY=replace_me_with_real_key',
    'TOKEN=${RUNTIME_TOKEN}',
    'TOKEN=too-short',
    'TOKEN_ENDPOINT=https://example.invalid/oauth/token',
  ].join('\n')

  const credentials = findEnvironmentCredentials(envSource)
  assert.deepEqual(credentials.map(({ key, line }) => ({ key, line })), [
    { key: 'API_KEY', line: 1 },
    { key: 'TOKEN', line: 2 },
    { key: 'NEXT_PUBLIC_PAYMENT_TOKEN', line: 3 },
  ])
  assert.equal(credentials[2].value, publicSecret)
  assert.deepEqual(findPublicProcessEnvironmentCredentials({
    NEXT_PUBLIC_PAYMENT_TOKEN: publicSecret,
    NEXT_PUBLIC_SITE_URL: 'https://example.invalid',
    SERVER_ONLY_TOKEN: secondSecret,
  }), [{ key: 'NEXT_PUBLIC_PAYMENT_TOKEN', value: publicSecret }])

  const bundledAssignment = `const config={apiKey:"${firstSecret}"}`
  assert.ok(matchingRules(bundledAssignment, highConfidenceSecretPatterns)
    .some((rule) => rule.label === 'hard-coded credential assignment'))
  assert.ok(publicEnvironmentCredentialPattern.test('process.env.NEXT_PUBLIC_PAYMENT_TOKEN'))
  assert.equal(findEnvironmentCredentials('API_KEY=placeholder\nTOKEN=${TOKEN}').length, 0)

  const whatsappHandoffs = [
    'window.open("https://wa.me/237000000000?text=hello")',
    'location.href="https://web.whatsapp.com/send?text=hello"',
    'location.href="whatsapp://send?text=hello"',
  ]
  for (const handoff of whatsappHandoffs) {
    assert.ok(matchingRules(handoff, forbiddenAppPatterns)
      .some((rule) => rule.label === 'WhatsApp personal-data handoff'))
  }
  assert.equal(matchingRules('WhatsApp user-agent preview', forbiddenOutputPatterns)
    .some((rule) => rule.label === 'WhatsApp personal-data handoff in production output'), false)

  console.log('Security scanner self-test passed.')
}

if (runSelfTest) {
  selfTest()
  process.exit(0)
}

function unwrapParentheses(expression) {
  let current = expression
  while (current && ts.isParenthesizedExpression(current)) current = current.expression
  return current
}

function isLocalizedStringObject(attribute) {
  if (!attribute.initializer || !ts.isJsxExpression(attribute.initializer)) return false
  const expression = attribute.initializer.expression
  if (!expression || !ts.isObjectLiteralExpression(expression)) return false
  if (expression.properties.length !== 2) return false

  const keys = new Set()
  for (const property of expression.properties) {
    if (!ts.isPropertyAssignment(property)) return false
    if (!ts.isIdentifier(property.name) && !ts.isStringLiteral(property.name)) return false
    if (!ts.isStringLiteral(property.initializer) && !ts.isNoSubstitutionTemplateLiteral(property.initializer)) {
      return false
    }
    keys.add(property.name.text)
  }

  return keys.size === 2 && keys.has('fr') && keys.has('en')
}

function isStrictMaintenancePage(source, fileName) {
  const sourceFile = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  if (sourceFile.parseDiagnostics.length > 0 || sourceFile.statements.length !== 2) return false

  const [importDeclaration, functionDeclaration] = sourceFile.statements
  if (!ts.isImportDeclaration(importDeclaration)) return false
  if (!ts.isStringLiteral(importDeclaration.moduleSpecifier)) return false
  if (importDeclaration.moduleSpecifier.text !== '@/components/security/secure-service-unavailable') {
    return false
  }

  const namedImports = importDeclaration.importClause?.namedBindings
  if (!namedImports || !ts.isNamedImports(namedImports) || namedImports.elements.length !== 1) return false
  if (namedImports.elements[0].name.text !== 'SecureServiceUnavailable') return false

  if (!ts.isFunctionDeclaration(functionDeclaration) || !functionDeclaration.body) return false
  const modifiers = new Set(functionDeclaration.modifiers?.map((modifier) => modifier.kind))
  if (!modifiers.has(ts.SyntaxKind.ExportKeyword) || !modifiers.has(ts.SyntaxKind.DefaultKeyword)) return false
  if (functionDeclaration.parameters.length !== 0 || functionDeclaration.body.statements.length !== 1) return false

  const returnStatement = functionDeclaration.body.statements[0]
  if (!ts.isReturnStatement(returnStatement) || !returnStatement.expression) return false
  const jsx = unwrapParentheses(returnStatement.expression)
  if (!jsx || !ts.isJsxSelfClosingElement(jsx) || jsx.tagName.getText() !== 'SecureServiceUnavailable') {
    return false
  }

  const attributes = jsx.attributes.properties
  if (attributes.length < 1 || attributes.length > 2) return false
  const names = new Set()
  for (const attribute of attributes) {
    if (!ts.isJsxAttribute(attribute) || !ts.isIdentifier(attribute.name)) return false
    if (!['service', 'message'].includes(attribute.name.text) || !isLocalizedStringObject(attribute)) return false
    names.add(attribute.name.text)
  }

  return names.size === attributes.length && names.has('service')
}

const failures = []
if (configuredBasePath && configuredBasePath !== '/' && !validBasePathPattern.test(configuredBasePath)) {
  failures.push('NEXT_PUBLIC_BASE_PATH is not a safe absolute URL path')
}
const appFiles = (
  await Promise.all(appRoots.map((root) => listFiles(path.join(projectRoot, root), appExtensions)))
).flat()

for (const file of appFiles) {
  const source = await readFile(file, 'utf8')
  for (const rule of forbiddenAppPatterns) {
    if (rule.pattern.test(source)) failures.push(`${rule.label}: ${path.relative(projectRoot, file)}`)
  }
}

const repositoryFiles = await listFiles(projectRoot, null, ignoredDirectories)
let repositoryFileCount = 0
const environmentCredentials = []
for (const file of repositoryFiles) {
  if (path.resolve(file) === path.resolve(import.meta.filename)) continue
  const contents = await readFile(file)
  if (isProbablyBinary(contents)) continue
  repositoryFileCount += 1
  const source = contents.toString('utf8')
  if (isEnvironmentFile(file)) {
    for (const credential of findEnvironmentCredentials(source)) {
      const relativePath = path.relative(projectRoot, file)
      const exposure = credential.key.toUpperCase().startsWith('NEXT_PUBLIC_')
        ? 'Browser-exposed credential in environment file'
        : 'Concrete credential in environment file'
      failures.push(`${exposure}: ${relativePath}:${credential.line} (${credential.key})`)
      environmentCredentials.push({ ...credential, relativePath })
    }
  }
  if (containsRetiredCredential(source)) {
    failures.push(`Retired credential restored: ${path.relative(projectRoot, file)}`)
  }
  for (const rule of highConfidenceSecretPatterns) {
    if (rule.pattern.test(source)) failures.push(`${rule.label}: ${path.relative(projectRoot, file)}`)
  }
}

if (requireOutput) {
  for (const credential of findPublicProcessEnvironmentCredentials(process.env)) {
    failures.push(`Browser-exposed credential in process environment (${credential.key})`)
    environmentCredentials.push({ ...credential, relativePath: 'process environment', line: 0 })
  }
}

for (const relativePath of forbiddenPaths) {
  if (await pathExists(relativePath)) failures.push(`Insecure legacy path restored: ${relativePath}`)
}

for (const relativePath of maintenancePages) {
  const source = await readFile(path.join(projectRoot, relativePath), 'utf8')
  if (!isStrictMaintenancePage(source, relativePath)) {
    failures.push(`Financial route is not strictly fail-closed: ${relativePath}`)
  }
}

if (await pathExists('src/app/reseller/page.tsx')) {
  const resellerPage = await readFile(path.join(projectRoot, 'src/app/reseller/page.tsx'), 'utf8')
  if (/<form\b|handleSubmit|formState|type=["'](?:email|tel)["']/.test(resellerPage)) {
    failures.push('Reseller page collects personal data without a secure backend')
  }
}

const mainLayout = await readFile(path.join(projectRoot, 'src/components/layout/MainLayout.tsx'), 'utf8')
if (/WhatsAppChat|whatsapp-chat/i.test(mainLayout)) {
  failures.push('Global layout restores the retired WhatsApp personal-data flow')
}

let outputFileCount = 0
if (requireOutput) {
  const outputRoot = path.join(projectRoot, 'out')
  if (!(await pathExists('out'))) {
    failures.push('Production output is missing; run npm run build first')
  } else {
    const outputFiles = await listFiles(outputRoot, null)
    for (const file of outputFiles) {
      const contents = await readFile(file)
      if (isProbablyBinary(contents)) continue
      outputFileCount += 1
      const source = contents.toString('utf8')
      if (containsRetiredCredential(source)) {
        failures.push(`Retired credential present in production output: ${path.relative(projectRoot, file)}`)
      }
      for (const rule of highConfidenceSecretPatterns) {
        if (rule.pattern.test(source)) {
          failures.push(`${rule.label} in production output: ${path.relative(projectRoot, file)}`)
        }
      }
      for (const rule of forbiddenOutputPatterns) {
        if (rule.pattern.test(source)) failures.push(`${rule.label}: ${path.relative(projectRoot, file)}`)
      }
      if (path.extname(file) === '.html' && expectedBasePath) {
        const rootReferences = source.matchAll(/\b(?:href|src)=["'](\/[^"'?#]*)/g)
        for (const reference of rootReferences) {
          const target = reference[1]
          if (target !== expectedBasePath && !target.startsWith(`${expectedBasePath}/`)) {
            failures.push(`Asset or link escapes GitHub Pages base path: ${path.relative(projectRoot, file)} (${target})`)
            break
          }
        }
      }
      for (const credential of environmentCredentials) {
        if (source.includes(credential.value)) {
          const exposure = credential.key.toUpperCase().startsWith('NEXT_PUBLIC_')
            ? 'NEXT_PUBLIC credential value embedded in production output'
            : 'Environment credential value embedded in production output'
          const origin = credential.line > 0
            ? `${credential.relativePath}:${credential.line}`
            : credential.relativePath
          failures.push(`${exposure}: ${path.relative(projectRoot, file)} (from ${origin})`)
        }
      }
    }

    for (const file of outputFiles) {
      if (path.extname(file) === '.map') {
        failures.push(`Source map published: ${path.relative(projectRoot, file)}`)
      }
    }

    const manifest = JSON.parse(await readFile(path.join(outputRoot, 'manifest.json'), 'utf8'))
    const manifestIcons = Array.isArray(manifest.icons) ? manifest.icons : []
    const manifestPaths = [manifest.id, manifest.start_url, manifest.scope, ...manifestIcons.map((icon) => icon.src)]
    if (manifestIcons.length === 0
      || manifestPaths.some((value) => typeof value !== 'string' || value.startsWith('/'))) {
      failures.push('Web app manifest paths must stay relative for GitHub Pages base-path support')
    }

    const rootHtml = await readFile(path.join(outputRoot, 'index.html'), 'utf8')
    if (!rootHtml.includes('http-equiv="Content-Security-Policy"')) {
      failures.push('Content Security Policy meta tag missing from production output')
    }
    if (!rootHtml.includes(`${expectedBasePath}/register-sw.js`)) {
      failures.push('Service-worker registration script is not scoped to the GitHub Pages base path')
    }

    if (process.env.NEXT_PUBLIC_SITE_URL) {
      const expectedSiteUrl = new URL(process.env.NEXT_PUBLIC_SITE_URL)
      expectedSiteUrl.pathname = `${expectedSiteUrl.pathname.replace(/\/$/, '')}/`
      const expectedSocialImage = new URL('og-image.svg', expectedSiteUrl).href
      if (!rootHtml.includes(expectedSocialImage)) {
        failures.push('Social preview image does not match the configured GitHub Pages URL')
      }
    }

    for (const route of maintenanceRoutes) {
      const candidates = [`out/${route}/index.html`, `out/${route}.html`]
      const pagePath = (await Promise.all(candidates.map(async (candidate) =>
        (await pathExists(candidate)) ? candidate : undefined))).find(Boolean)
      if (!pagePath) {
        failures.push(`Maintenance page missing from production output: /${route}`)
        continue
      }
      const html = await readFile(path.join(projectRoot, pagePath), 'utf8')
      if (!html.includes('temporairement indisponible') || !html.includes('Ne transmettez jamais')) {
        failures.push(`Financial route is not fail-closed in production output: /${route}`)
      }
    }

    for (const retiredRoute of ['admin/newsletter', 'api/newsletter']) {
      const candidates = [
        `out/${retiredRoute}`,
        `out/${retiredRoute}.html`,
        `out/${retiredRoute}/index.html`,
      ]
      if ((await Promise.all(candidates.map(pathExists))).some(Boolean)) {
        failures.push(`Retired route published in production output: /${retiredRoute}`)
      }
    }
  }
}

if (failures.length > 0) {
  console.error('Security safeguards failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

const outputSummary = requireOutput ? `; ${outputFileCount} production files scanned` : ''
console.log(`Security safeguards passed (${repositoryFileCount} repository files scanned${outputSummary}).`)
