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
  {
    label: 'Soleas credential in client source',
    pattern: /\b(?:SOLEAS_API_KEY|NEXT_PUBLIC_SOLEAS[A-Z0-9_]*|apiKey)\b/i,
  },
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
    label: 'legacy browser-side Soleas checkout endpoint',
    pattern: /https:\/\/checkout\.soleaspay\.com\/?(?:["'`<>\s]|$)/i,
  },
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
  {
    label: 'legacy browser-side Soleas checkout form in production output',
    pattern: /https:\/\/checkout\.soleaspay\.com\/?(?:["'`<>\s]|$)|name=["']apiKey["']/i,
  },
  {
    label: 'retired hosted-payment integration in production output',
    pattern: /soleaspay/i,
  },
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
  'src/components/ui/whatsapp-chat.tsx',
  'src/lib/card-catalog.ts',
  'src/lib/soleas-payment.ts',
]

const requiredCardSurfacePaths = [
  'src/app/page.tsx',
  'src/components/ui/dialog-notes.tsx',
]

const optionalCardSurfacePaths = [
  'src/components/ui/tabs.tsx',
]

const forbiddenPageRoutes = [
  'about-us',
  'balance',
  'cards',
  'cookies',
  'faq',
  'howitwork',
  'payment-failure',
  'payment-success',
  'privacy',
  'reseller',
  'terms',
  'topup',
  'withdrawal',
]

const forbiddenCardSurfacePatterns = [
  {
    label: 'Card catalogue is still replaced by the maintenance screen',
    pattern: /SecureServiceUnavailable/,
  },
  {
    label: 'Card purchase surface uses localStorage',
    pattern: /\blocalStorage\b/,
  },
  {
    label: 'Card purchase surface contains an HTML injection sink',
    pattern: /dangerouslySetInnerHTML|\.innerHTML\s*=/,
  },
  {
    label: 'Card purchase surface restores a browser-side payment form',
    pattern: /<form\b|document\.createElement\(\s*["']form["']\s*\)|\b(?:createPaymentGateway|submitPaymentForm|openPaymentModal)\b|customer\[(?:email|name)\]/i,
  },
  {
    label: 'Card purchase surface contains a personal-data input',
    pattern: /<(?:input|select|textarea)\b|\bcontentEditable\b/i,
  },
  {
    label: 'Card purchase surface contains retired payment navigation',
    pattern: /\b(?:window\.open|window\.location\.(?:assign|replace)|createPaymentGateway|submitPaymentForm|openPaymentModal|fetch)\s*\(|<a\b|<Link\b|\bhref\s*=/i,
  },
  {
    label: 'Card purchase surface references a retired payment provider',
    pattern: /soleas|soleaspay/i,
  },
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

  assert.ok(matchingRules('const apiKey = process.env.VALUE', forbiddenAppPatterns)
    .some((rule) => rule.label === 'Soleas credential in client source'))
  assert.ok(matchingRules('const endpoint = "https://checkout.soleaspay.com"', forbiddenAppPatterns)
    .some((rule) => rule.label === 'legacy browser-side Soleas checkout endpoint'))
  assert.ok(matchingRules('localStorage.setItem("userEmail", email)', forbiddenCardSurfacePatterns)
    .some((rule) => rule.label === 'Card purchase surface uses localStorage'))
  assert.ok(matchingRules('<form action="https://checkout.soleaspay.com">', forbiddenCardSurfacePatterns)
    .some((rule) => rule.label === 'Card purchase surface restores a browser-side payment form'))
  assert.ok(matchingRules('<input type="email" />', forbiddenCardSurfacePatterns)
    .some((rule) => rule.label === 'Card purchase surface contains a personal-data input'))
  assert.ok(matchingRules('window.location.assign(paymentLink)', forbiddenCardSurfacePatterns)
    .some((rule) => rule.label === 'Card purchase surface contains retired payment navigation'))

  const safePaymentButtons = `
    export function PaymentDialog() {
      return <div><Button disabled>Proceed</Button><Button disabled={true}>Direct</Button></div>
    }
  `
  assert.deepEqual(validateDisabledPaymentButtons(safePaymentButtons, 'safe-dialog.tsx'), [])
  assert.ok(validateDisabledPaymentButtons(`
    export function PaymentDialog() {
      return <div><Button disabled={canPay} onClick={pay}>Proceed</Button><Button disabled>Direct</Button></div>
    }
  `, 'unsafe-dialog.tsx').some((failure) => failure.includes('statically disabled')))
  assert.ok(validateDisabledPaymentButtons(`
    export function PaymentDialog() {
      return <div><Link href="/pay"><Button disabled>Proceed</Button></Link><Button disabled>Direct</Button></div>
    }
  `, 'linked-dialog.tsx').some((failure) => failure.includes('must not be nested')))
  assert.ok(validateDisabledPaymentButtons(`
    export function PaymentDialog() {
      return <div><span onClick={pay}><Button disabled>Proceed</Button></span><Button disabled>Direct</Button></div>
    }
  `, 'wrapped-dialog.tsx').some((failure) => failure.includes('interactive wrapper')))

  console.log('Security scanner self-test passed.')
}

if (runSelfTest) {
  selfTest()
  process.exit(0)
}

function isLinkTagName(tagName) {
  return tagName === 'a' || tagName === 'Link' || tagName === 'NextLink'
}

function isActivationHandlerName(name) {
  return /^on(?:Click|DoubleClick|Key|Mouse|Pointer|Submit|Touch)/i.test(name)
}

function getJsxOpeningElement(node) {
  if (ts.isJsxElement(node)) return node.openingElement
  if (ts.isJsxSelfClosingElement(node)) return node
  return undefined
}

function hasInteractiveDescendant(node) {
  let found = false

  function visit(child) {
    if (found) return
    const openingElement = getJsxOpeningElement(child)
    if (openingElement) {
      const attributes = openingElement.attributes.properties
      const hasInteractiveAttribute = attributes.some((attribute) =>
        ts.isJsxSpreadAttribute(attribute)
        || (ts.isJsxAttribute(attribute)
          && (isActivationHandlerName(attribute.name.getText())
            || attribute.name.getText() === 'href')))
      if (isLinkTagName(openingElement.tagName.getText()) || hasInteractiveAttribute) {
        found = true
        return
      }
    }
    ts.forEachChild(child, visit)
  }

  ts.forEachChild(node, visit)
  return found
}

function hasInteractiveAncestor(node) {
  let current = node.parent
  while (current) {
    const openingElement = getJsxOpeningElement(current)
    if (openingElement) {
      if (isLinkTagName(openingElement.tagName.getText())) return true
      const hasActivationHandler = openingElement.attributes.properties.some((attribute) =>
        ts.isJsxAttribute(attribute) && isActivationHandlerName(attribute.name.getText()))
      if (hasActivationHandler) return true
    }
    current = current.parent
  }
  return false
}

function isStaticallyDisabled(attribute) {
  if (!attribute.initializer) return true
  return ts.isJsxExpression(attribute.initializer)
    && attribute.initializer.expression?.kind === ts.SyntaxKind.TrueKeyword
}

function validateDisabledPaymentButtons(source, fileName) {
  const sourceFile = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  if (sourceFile.parseDiagnostics.length > 0) {
    return [`Payment dialog cannot be parsed as TSX: ${fileName}`]
  }

  const buttons = []
  function visit(node) {
    const openingElement = getJsxOpeningElement(node)
    if (openingElement?.tagName.getText() === 'Button') {
      buttons.push({ node, openingElement })
    }
    ts.forEachChild(node, visit)
  }
  visit(sourceFile)

  const buttonFailures = []
  if (buttons.length !== 2) {
    buttonFailures.push(`Payment dialog must contain exactly two Button controls (found ${buttons.length})`)
  }

  for (const [index, { node, openingElement }] of buttons.entries()) {
    const label = `Payment button ${index + 1}`
    const attributes = openingElement.attributes.properties
    if (attributes.some((attribute) => ts.isJsxSpreadAttribute(attribute))) {
      buttonFailures.push(`${label} must not use spread attributes`)
    }

    const jsxAttributes = attributes.filter(ts.isJsxAttribute)
    const disabledAttributes = jsxAttributes.filter((attribute) => attribute.name.getText() === 'disabled')
    if (disabledAttributes.length !== 1 || !isStaticallyDisabled(disabledAttributes[0])) {
      buttonFailures.push(`${label} must be statically disabled`)
    }

    const forbiddenAttributes = jsxAttributes
      .map((attribute) => attribute.name.getText())
      .filter((name) => /^on/i.test(name)
        || ['action', 'asChild', 'formAction', 'href', 'target'].includes(name))
    if (forbiddenAttributes.length > 0) {
      buttonFailures.push(`${label} has forbidden interactive attributes: ${forbiddenAttributes.join(', ')}`)
    }

    if (hasInteractiveDescendant(node) || hasInteractiveAncestor(node)) {
      buttonFailures.push(`${label} must not be nested in or contain an interactive wrapper`)
    }
  }

  return buttonFailures
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

const appRouteSources = appFiles
  .map((file) => path.relative(projectRoot, file).split(path.sep).join('/'))
  .filter((relativePath) => /^src\/app\/(?:.+\/)?(?:page|route)\.(?:js|jsx|ts|tsx)$/.test(relativePath))
for (const relativePath of appRouteSources) {
  if (relativePath !== 'src/app/page.tsx') {
    failures.push(`Unexpected application route in single-page build: ${relativePath}`)
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

const cardSurfaceSources = []
let cardPageSource = ''
let paymentDialogSource = ''
for (const relativePath of requiredCardSurfacePaths) {
  if (!(await pathExists(relativePath))) {
    failures.push(`Required static card-purchase surface is missing: ${relativePath}`)
    continue
  }

  const source = await readFile(path.join(projectRoot, relativePath), 'utf8')
  cardSurfaceSources.push(source)
  if (relativePath === 'src/app/page.tsx') cardPageSource = source
  if (relativePath === 'src/components/ui/dialog-notes.tsx') paymentDialogSource = source
}
for (const relativePath of optionalCardSurfacePaths) {
  if (await pathExists(relativePath)) {
    cardSurfaceSources.push(await readFile(path.join(projectRoot, relativePath), 'utf8'))
  }
}

const cardCatalogueSource = cardSurfaceSources.join('\n')
for (const rule of forbiddenCardSurfacePatterns) {
  if (rule.pattern.test(cardCatalogueSource)) failures.push(rule.label)
}
if (cardPageSource && !/\bDialogNotes\b/.test(cardPageSource)) {
  failures.push('Card catalogue does not use the restored usage-notes dialog')
}
if (paymentDialogSource) {
  failures.push(...validateDisabledPaymentButtons(
    paymentDialogSource,
    'src/components/ui/dialog-notes.tsx',
  ))
}

if (await pathExists('src/components/layout/MainLayout.tsx')) {
  const mainLayout = await readFile(path.join(projectRoot, 'src/components/layout/MainLayout.tsx'), 'utf8')
  if (/WhatsAppChat|whatsapp-chat/i.test(mainLayout)) {
    failures.push('Global layout restores the retired WhatsApp personal-data flow')
  }
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

    if (!rootHtml.includes('Cartes virtuelles DRAVA')
      || rootHtml.includes('Achat de cartes temporairement indisponible')) {
      failures.push('Card catalogue is missing from the production root page')
    }

    for (const route of forbiddenPageRoutes) {
      const candidates = [
        `out/${route}`,
        `out/${route}.html`,
        `out/${route}/index.html`,
      ]
      if ((await Promise.all(candidates.map(pathExists))).some(Boolean)) {
        failures.push(`Removed route is still present in production output: /${route}`)
      }
    }

    const allowedHtmlPaths = new Set(['404.html', '404/index.html', 'index.html'])
    const forbiddenRouteNames = new Set(forbiddenPageRoutes)
    for (const file of outputFiles) {
      if (path.extname(file) !== '.html') continue
      const relativePath = path.relative(outputRoot, file).split(path.sep).join('/')
      const firstSegment = relativePath.split('/')[0].replace(/\.html$/, '')
      if (!allowedHtmlPaths.has(relativePath) && !forbiddenRouteNames.has(firstSegment)) {
        failures.push(`Unexpected HTML route in single-page production output: ${relativePath}`)
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
