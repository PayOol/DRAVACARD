import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
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

const proxyOrigin = 'https://drava-leekpay.sebpay-proxy.workers.dev'
const providerCheckoutApi = 'https://leekpay.fr/api/v1/checkout'
const frontendAdapterPath = 'src/lib/leekpay.ts'
const checkoutDialogPath = 'src/components/ui/dialog-checkout.tsx'
const customerDialogPath = 'src/components/ui/dialog-customer.tsx'
const providerDialogPath = 'src/components/ui/dialog-providers.tsx'
const usageNotesDialogPath = 'src/components/ui/dialog-notes.tsx'
const paymentCustomerPath = 'src/lib/payment-customer.ts'
const customerLocationPath = 'src/lib/customer-location.ts'
const paymentResultPath = 'src/components/payment/PaymentResult.tsx'
const paymentReceiptPath = 'src/components/payment/PaymentReceipt.tsx'
const themeTogglePath = 'src/components/layout/ThemeToggle.tsx'
const workerSourcePath = 'worker/src/index.ts'
const workerConfigPath = 'worker/wrangler.jsonc'

const allowedRouteSources = new Set([
  'src/app/page.tsx',
  'src/app/payment-success/page.tsx',
  'src/app/payment-failure/page.tsx',
])

const forbiddenPageRoutes = [
  'about-us',
  'balance',
  'cards',
  'cookies',
  'faq',
  'howitwork',
  'privacy',
  'reseller',
  'terms',
  'topup',
  'withdrawal',
]

const requiredPaths = [
  'src/app/page.tsx',
  'src/app/payment-success/page.tsx',
  'src/app/payment-failure/page.tsx',
  'src/app/layout.tsx',
  checkoutDialogPath,
  customerDialogPath,
  usageNotesDialogPath,
  providerDialogPath,
  paymentResultPath,
  paymentReceiptPath,
  frontendAdapterPath,
  paymentCustomerPath,
  customerLocationPath,
  workerSourcePath,
  workerConfigPath,
  'worker/package.json',
  'worker/package-lock.json',
  'worker/tsconfig.json',
  'worker/test/worker.test.mjs',
  'worker/.dev.vars.example',
]

const forbiddenPaths = [
  'src/app/admin/newsletter/page.tsx',
  'src/app/api/newsletter/route.ts',
  'src/components/providers/soleas-payment-provider.tsx',
  'src/components/ui/whatsapp-chat.tsx',
  'src/lib/card-catalog.ts',
  'src/lib/soleas-payment.ts',
  'src/types/leekpay.d.ts',
]

const ignoredDirectories = new Set([
  '.git',
  '.next',
  '.next-dev',
  '.next-review-root-build',
  '.wrangler',
  'coverage',
  'dist',
  'logs',
  'node_modules',
  'out',
  'out-review-root-build',
])
const appExtensions = new Set(['.css', '.html', '.js', '.jsx', '.json', '.mjs', '.svg', '.ts', '.tsx'])

const retiredCredentialHashes = new Set([
  // SHA-256 only: keeping revoked/plain browser keys here would recreate leaks.
  '5755520164cac3c3fd5957bd48249ea21b88a4b9f36f924b54cb3847ecbc8be1',
  '928e52743b156d80d65278eea4ec6cb0e5b6ed2042f68616815eaead0d6054ee',
])

const providerCredentialPattern = /\b(?:pk|sk)_(?:live|test)_[A-Za-z0-9_-]{8,}\b/i
const publicCredentialReferencePattern =
  /\bNEXT_PUBLIC_[A-Z0-9_]*(?:API_?KEY|ACCESS_?KEY|AUTH_?TOKEN|BEARER_?TOKEN|TOKEN|SECRET|PASSWORD|PRIVATE_?KEY|CLIENT_?SECRET)\b/i
const sensitiveEnvironmentNamePattern =
  /(?:^|_)(?:API_?KEY|ACCESS_?KEY|AUTH_?TOKEN|BEARER_?TOKEN|TOKEN|SECRET|SECRET_?KEY|PASSWORD|PASSWD|PRIVATE_?KEY|CLIENT_?SECRET)$/i
const environmentPlaceholderPattern =
  /^(?:\$\{?[A-Z_][A-Z0-9_]*\}?|<[^>]+>|(?:your|insert|replace)(?:[_ -](?:actual|real|the))?[_ -].+|replace-with-.+|change[_ -]?me(?:[_ -].*)?|example(?:[_ -].*)?|placeholder(?:[_ -].*)?|todo|unset|none|null|x{8,})$/i

const highConfidenceSecretPatterns = [
  { label: 'provider credential', pattern: providerCredentialPattern },
  { label: 'private key', pattern: /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----/ },
  { label: 'AWS access key', pattern: /\bAKIA[0-9A-Z]{16}\b/ },
  { label: 'GitHub token', pattern: /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{50,})\b/ },
  { label: 'Slack token', pattern: /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/ },
  {
    label: 'hard-coded credential assignment',
    pattern: /(?:api[_-]?key|client[_-]?secret|password|secret|token)\s*[:=]\s*["'][A-Za-z0-9+/_=.~-]{20,}["']/i,
  },
]

const forbiddenFrontendPatterns = [
  { label: 'legacy LeekPay browser SDK', pattern: /leekpay\.fr\/js\/leekpay\.js|\bwindow\.LeekPay\b|\bLeekPay\s*\.\s*(?:checkout|configure|redirect|close)/i },
  { label: 'provider API exposed to the browser', pattern: /https:\/\/(?:www\.)?leekpay\.(?:fr|me)|\/api\/public\/widget\/checkout/i },
  { label: 'payment credential in frontend source', pattern: providerCredentialPattern },
  { label: 'payment API key field in frontend source', pattern: /\bapiKey\s*:/ },
  { label: 'legacy XAF currency', pattern: /\bXAF\b/ },
  { label: 'Soleas integration', pattern: /soleas|soleaspay/i },
  { label: 'FormSubmit relay', pattern: /formsubmit\.co/i },
  { label: 'WhatsApp personal-data handoff', pattern: /wa\.me(?:\/|\?)|(?:api|web)\.whatsapp\.com\/send|whatsapp:\/\/send/i },
  { label: 'HTML injection sink', pattern: /dangerouslySetInnerHTML|\.innerHTML\s*=/ },
  { label: 'payment iframe', pattern: /<iframe\b|document\.createElement\(\s*["']iframe["']\s*\)/i },
  { label: 'obsolete service-worker cache', pattern: /drava-cache-v1/ },
  {
    label: 'financial or personal data in browser storage',
    pattern: /(?:localStorage|sessionStorage)\.(?:getItem|setItem)\(\s*["'][^"']*(?:card|cvv|email|whatsapp|phone|customer|otp|pan|withdraw|code|order|payment|token)/i,
  },
  {
    label: 'automatic card fulfillment from browser state',
    pattern: /\b(?:autoFulfill|fulfillOrder|issueCard|issueVirtualCard|provisionCard|deliverCard|revealCard|generateCard|activateCard)\s*\(/i,
  },
  {
    label: 'retired payment provider integration',
    pattern: /\b(?:Stripe|PayPal|PaystackPop|FlutterwaveCheckout|SoleasPay)\s*\.|(?:js\.stripe\.com|paypal\.com\/sdk|js\.paystack\.co|checkout\.flutterwave\.com)/i,
  },
  {
    label: 'external image host',
    pattern: /https?:\/\/(?:images\.unsplash\.com|source\.unsplash\.com|ext\.same-assets\.com|ugc\.same-assets\.com|cdn\.jsdelivr\.net\/gh\/lipis\/flag-icons)\b/i,
  },
]

const forbiddenOutputPatterns = [
  // Next's reviewed framework runtime contains this generic DOM primitive. The
  // first-party source scan above remains authoritative for custom injection sinks.
  ...forbiddenFrontendPatterns.filter(({ label }) => label !== 'HTML injection sink'),
  { label: 'sensitive NEXT_PUBLIC credential reference', pattern: publicCredentialReferencePattern },
  { label: 'card-data collection field', pattern: /\bcard_number\b|cardNumberPlaceholder|cvvPlaceholder/i },
  { label: 'withdrawal state', pattern: /withdrawalData|withdrawalHistory|dravaCards/i },
  { label: 'source map reference', pattern: /sourceMappingURL\s*=\s*[^\s]+\.map/i },
]

async function listFiles(directory, extensions, ignored = new Set()) {
  let entries
  try {
    entries = await readdir(directory, { withFileTypes: true })
  } catch (error) {
    if (error?.code === 'ENOENT') return []
    throw error
  }
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

function normalizedRelativePath(file) {
  return path.relative(projectRoot, file).split(path.sep).join('/')
}

function isIgnoredGeneratedFile(relativePath) {
  return relativePath === 'worker/worker-configuration.d.ts'
    || relativePath.startsWith('worker/.wrangler/')
    || relativePath.startsWith('worker/dist/')
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
  const basename = path.basename(file)
  return /^\.env(?:\.|$)/i.test(basename) || /^\.dev\.vars(?:\.|$)/i.test(basename)
}

function normalizeEnvironmentValue(rawValue) {
  let value = rawValue.trim()
  if (["\"", "'", '`'].includes(value[0])) {
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
    if (looksLikeConcreteSecret(value)) credentials.push({ key: assignment[1], line: index + 1, value })
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

function extractHttpUrls(source) {
  return source.match(/https?:\/\/[^\s"'`<>),;]*/gi) ?? []
}

function validateFrontendUrls(source, relativePath, productionBundle = false) {
  const failures = []
  for (const url of extractHttpUrls(source)) {
    if (/leekpay\.(?:fr|me)/i.test(url)) {
      failures.push(`Provider URL must not be bundled in the browser: ${relativePath} (${url})`)
    }
    if (/workers\.dev/i.test(url)) {
      const sourceAllowed = relativePath === frontendAdapterPath || relativePath === 'src/app/layout.tsx'
      if (url !== proxyOrigin || (!productionBundle && !sourceAllowed)) {
        failures.push(`Unapproved payment proxy URL: ${relativePath} (${url})`)
      }
    }
  }
  return failures
}

function validateWorkerUrls(source) {
  const failures = []
  for (const url of extractHttpUrls(source)) {
    if (/leekpay\.(?:fr|me)/i.test(url) && url !== providerCheckoutApi) {
      failures.push(`Unapproved LeekPay upstream URL in ${workerSourcePath}: ${url}`)
    }
  }
  return failures
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
          && (isActivationHandlerName(attribute.name.getText()) || attribute.name.getText() === 'href')))
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
      if (openingElement.attributes.properties.some((attribute) =>
        ts.isJsxAttribute(attribute) && isActivationHandlerName(attribute.name.getText()))) return true
    }
    current = current.parent
  }
  return false
}

function validateUsageNotesButtons(source, fileName) {
  const sourceFile = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  if (sourceFile.parseDiagnostics.length > 0) return [`Usage-notes dialog cannot be parsed: ${fileName}`]

  const buttons = []
  function visit(node) {
    const openingElement = getJsxOpeningElement(node)
    if (openingElement?.tagName.getText() === 'Button') buttons.push({ node, openingElement })
    ts.forEachChild(node, visit)
  }
  visit(sourceFile)

  const failures = []
  if (buttons.length !== 2) failures.push(`Usage-notes dialog must contain exactly two Button controls (found ${buttons.length})`)
  for (const [index, { node, openingElement }] of buttons.entries()) {
    const label = index === 0 ? 'Usage-notes accept button' : 'Usage-notes decline button'
    const attributes = openingElement.attributes.properties
    if (attributes.some(ts.isJsxSpreadAttribute)) failures.push(`${label} must not use spread attributes`)
    const jsxAttributes = attributes.filter(ts.isJsxAttribute)
    const names = jsxAttributes.map((attribute) => attribute.name.getText())
    if (names.includes('disabled')) failures.push(`${label} must remain active`)
    const clicks = jsxAttributes.filter((attribute) => attribute.name.getText() === 'onClick')
    if (clicks.length !== 1) failures.push(`${label} must have exactly one onClick handler`)
    const expectedHandler = index === 0 ? 'onAccept' : 'onClose'
    const clickInitializer = clicks[0]?.initializer
    const clickExpression = clickInitializer && ts.isJsxExpression(clickInitializer) ? clickInitializer.expression : undefined
    if (!clickExpression || !ts.isIdentifier(clickExpression) || clickExpression.text !== expectedHandler) {
      failures.push(`${label} must call ${expectedHandler} directly`)
    }
    const typeAttribute = jsxAttributes.find((attribute) => attribute.name.getText() === 'type')
    if (!typeAttribute?.initializer || !ts.isStringLiteral(typeAttribute.initializer)
      || typeAttribute.initializer.text !== 'button') failures.push(`${label} must have type="button"`)
    const forbiddenAttributes = names.filter((name) => /^on(?!Click$)/i.test(name)
      || ['action', 'asChild', 'formAction', 'href', 'target'].includes(name))
    if (forbiddenAttributes.length > 0) failures.push(`${label} has forbidden attributes: ${forbiddenAttributes.join(', ')}`)
    if (hasInteractiveDescendant(node) || hasInteractiveAncestor(node)) {
      failures.push(`${label} must not be nested in or contain an interactive wrapper`)
    }
  }
  if (!/Refuser/.test(source) || !/Decline/.test(source)) failures.push('Usage-notes decline labels must remain Refuser/Decline')
  return failures
}

function compact(source) {
  return source.replace(/\s+/g, '')
}

function validateFrontendAdapter(source) {
  const failures = []
  const condensed = compact(source)
  if ((source.split(proxyOrigin).length - 1) !== 1) failures.push(`Frontend adapter must declare the exact proxy origin once: ${proxyOrigin}`)
  for (const name of ['createLeekPayCheckout', 'getLeekPayOrderStatus', 'readOrderToken']) {
    if (!new RegExp(`export(?:async)?function${name}`).test(condensed)) failures.push(`Frontend adapter is missing ${name}`)
  }
  if (!/from["']\.\/payment-customer\.ts["']/.test(condensed)
    || !/normalizePaymentCustomer/.test(source)
    || !/exportasyncfunctioncreateLeekPayCheckout\(productId:string,customer:PaymentCustomer,signal\?:AbortSignal,?\)/.test(condensed)) {
    failures.push('Frontend checkout must require and revalidate a PaymentCustomer')
  }
  if (!source.includes('"/api/checkout"') && !source.includes("'/api/checkout'")) failures.push('Frontend adapter is missing POST /api/checkout')
  if (!source.includes('"/api/orders/status"') && !source.includes("'/api/orders/status'")) failures.push('Frontend adapter is missing POST /api/orders/status')
  if (!/method:\s*["']POST["']/.test(source)) failures.push('Frontend payment requests must use POST')
  if (!/requestPaymentApi\(["']\/api\/checkout["'],\{productId,customer:\{email:normalizedCustomer\.email,whatsapp:normalizedCustomer\.whatsapp,?\},?\},signal,?\)/.test(condensed)) {
    failures.push('Checkout request body must contain only productId and canonical email/whatsapp')
  }
  if (!/requestPaymentApi\(["']\/api\/orders\/status["'],\{orderToken\},signal,?\)/.test(condensed)) failures.push('Status request body must contain only orderToken')
  if (!/credentials:\s*["']omit["']/.test(source) || !/cache:\s*["']no-store["']/.test(source)
    || !/redirect:\s*["']error["']/.test(source)) failures.push('Frontend proxy fetch must omit credentials, disable caching and reject redirects')
  if (!/\^#order=\(\[a-f0-9\]\{64\}\)\$/.test(source)) failures.push('Order token must be read only from exact #order=<64 lowercase hex> fragment')
  if (!/data\.verified\s*!==\s*\(data\.status\s*===\s*["']paid["']\)/.test(source)) failures.push('Frontend adapter must reject paid/status verification mismatches')
  if (!/data\.currency\s*!==\s*LEEKPAY_CHECKOUT_CURRENCY/.test(source)
    || !/LEEKPAY_CHECKOUT_CURRENCY\s*=\s*["']XOF["']/.test(source)) failures.push('Frontend adapter must accept XOF only')
  if (/\b(?:amount|currency|description)\s*:\s*[^,}]+/.test(source.match(/requestPaymentApi\(["']\/api\/checkout["'][\s\S]{0,200}/)?.[0] ?? '')) {
    failures.push('Frontend checkout request must not send amount, currency or description')
  }
  if (/\b(?:localStorage|sessionStorage)\b/.test(source)
    || /\bconsole\.(?:log|info|warn|error|debug)\s*\([^)]*(?:customer|email|whatsapp|phone)/i.test(source)
    || /(?:URLSearchParams|location\.(?:href|search)|new URL)\s*\([^)]*(?:customer|email|whatsapp|phone)/i.test(source)) {
    failures.push('Frontend adapter must not persist, log or place customer details in URLs')
  }
  return failures
}

function countOpeningTags(source, tagName) {
  return source.match(new RegExp(`<${tagName.replace('.', '\\.')}\\b`, 'g'))?.length ?? 0
}

function hasExactInterfaceProperties(source, interfaceName, expectedNames) {
  const sourceFile = ts.createSourceFile(interfaceName, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const declaration = sourceFile.statements.find((statement) =>
    ts.isInterfaceDeclaration(statement) && statement.name.text === interfaceName)
  if (!declaration || declaration.members.length !== expectedNames.length) return false
  const actualNames = declaration.members.map((member) =>
    ts.isPropertySignature(member) && member.name && ts.isIdentifier(member.name) ? member.name.text : null)
  return actualNames.every((name) => name !== null) && expectedNames.every((name) => actualNames.includes(name))
}

function validatePaymentCustomer(source) {
  const failures = []
  const condensed = compact(source)
  if (!hasExactInterfaceProperties(source, 'PaymentCustomer', ['email', 'whatsapp'])) failures.push('PaymentCustomer must contain only email and whatsapp')
  for (const name of ['normalizeCustomerEmail', 'normalizeWhatsAppNumber', 'normalizePaymentCustomer']) {
    if (!new RegExp(`exportfunction${name}\\(`).test(condensed)) failures.push(`Customer validator is missing ${name}`)
  }
  if (!/Reflect\.ownKeys\(value\)/.test(source)
    || !/keys\.length\s*!==\s*2/.test(source)
    || !/keys\.includes\(["']email["']\)/.test(source)
    || !/keys\.includes\(["']whatsapp["']\)/.test(source)) failures.push('Customer validator must reject missing, extra and symbol keys')
  if (!/email\.length\s*>\s*254/.test(source)
    || !/local\.length\s*>\s*64/.test(source)
    || !/code\s*<\s*32\s*\|\|\s*code\s*>\s*126/.test(source)) failures.push('Customer email validation must retain length and control-character bounds')
  if (!/\^\\\+\[1-9\]\[0-9\]\{7,14\}\$/.test(source)) failures.push('WhatsApp validation must produce a bounded E.164 number')
  if (!/return\s*\{\s*email,\s*whatsapp\s*\}/.test(source)) failures.push('Customer normalization must return only canonical email and whatsapp')
  if (/\b(?:name|address|city|country|postal|password|cardNumber|card_number|cvv|otp|pan)\s*[:;,]/i.test(source)) failures.push('Customer validation must not introduce additional personal or payment fields')
  return failures
}

function validateCustomerLocation(source) {
  const failures = []
  const condensed = compact(source)
  if (!hasExactInterfaceProperties(source, 'CustomerLocation', ['countryCode', 'callingCode'])) {
    failures.push('CustomerLocation must expose only countryCode and callingCode')
  }
  if (!/import\{LEEKPAY_API_BASE\}from["']\.\/leekpay\.ts["']/.test(condensed)
    || !/exportasyncfunctiondetectCustomerLocation\(signal\?:AbortSignal,?\):Promise<CustomerLocation\|null>/.test(condensed)) {
    failures.push('Location detection must use the reviewed proxy helper contract')
  }
  if ((source.match(/\bfetch\s*\(/g)?.length ?? 0) !== 1
    || (source.match(/\/api\/location/g)?.length ?? 0) !== 1
    || !/fetch\(`\$\{LEEKPAY_API_BASE\}\/api\/location`,\{/.test(condensed)
    || !/method:["']GET["']/.test(condensed)
    || !/headers:\{Accept:["']application\/json["']\}/.test(condensed)
    || !/credentials:["']omit["']/.test(condensed)
    || !/cache:["']no-store["']/.test(condensed)
    || !/redirect:["']error["']/.test(condensed)
    || !/referrerPolicy:["']no-referrer["']/.test(condensed)) {
    failures.push('Location lookup must be one bodyless, uncached GET to the fixed proxy')
  }
  if (!/constMAX_RESPONSE_BYTES=1024;?/.test(condensed)
    || !/consttimeout=setTimeout\(abort,4000\)/.test(condensed)
    || !/newAbortController\(\)/.test(condensed)
    || !/signal\?\.addEventListener\(["']abort["'],abort,\{once:true\}\)/.test(condensed)
    || !/signal\?\.removeEventListener\(["']abort["'],abort\)/.test(condensed)
    || !/clearTimeout\(timeout\)/.test(condensed)
    || !/response\.body\?\.getReader\(\)/.test(condensed)) {
    failures.push('Location lookup must enforce caller cancellation, a 4-second deadline and a 1 KiB response limit')
  }
  if (!/Object\.keys\(location\)/.test(source)
    || !/keys\.length\s*!==\s*2/.test(source)
    || !/keys\.includes\(["']countryCode["']\)/.test(source)
    || !/keys\.includes\(["']callingCode["']\)/.test(source)
    || !/\^\[A-Z\]\{2\}\$/.test(source)
    || !/\^\\\+\[1-9\]\[0-9\]\{0,2\}\$/.test(source)
    || !/return\s*\{\s*countryCode:\s*location\.countryCode,\s*callingCode:\s*location\.callingCode,?\s*\}/.test(source)) {
    failures.push('Location response must contain only a strict country code and calling code')
  }
  if (!/catch\s*\{\s*return null;?\s*\}/.test(source)
    || !/if\s*\(signal\?\.aborted\)\s*return null/.test(source)) {
    failures.push('Location detection must quietly fall back to null, including cancellation')
  }
  if (/\b(?:navigator\s*\.\s*(?:geolocation|permissions)|geolocation|getCurrentPosition|watchPosition|coordinates|latitude|longitude|city|region|postal|timezone|address|CF-IPCountry)\b/i.test(source)
    || /\b(?:localStorage|sessionStorage|indexedDB|document\.cookie)\b/.test(source)
    || /\bconsole\.(?:log|info|warn|error|debug)\s*\(/.test(source)
    || /\b(?:URLSearchParams|new URL)\b|\bbody\s*:/.test(source)
    || extractHttpUrls(source).length > 0) {
    failures.push('Location detection must not use GPS, spoofable hints, storage, logs, request data or another origin')
  }
  return failures
}

function validateUsageNotesStructure(source) {
  const failures = []
  const condensed = compact(source)
  if (!/exportfunctionUsageNotes\(\{onClose,onAccept\}:UsageNotesProps\)/.test(condensed)
    && !/exportfunctionUsageNotes\(\{onAccept,onClose\}:UsageNotesProps\)/.test(condensed)) {
    failures.push('Usage notes must export the onAccept/onClose content fragment')
  }
  if (!hasExactInterfaceProperties(source, 'UsageNotesProps', ['onAccept', 'onClose'])) failures.push('Usage notes props must contain only onAccept and onClose')
  if (/DialogPrimitive\./.test(source)) failures.push('Usage notes must remain a plain fragment inside the checkout dialog')
  if (/\b(?:isOpen|onExitComplete)\b/.test(source)) failures.push('Usage notes must not receive dialog lifecycle props')
  if (/\b(?:createLeekPayCheckout|requestPaymentApi|handleCheckout)\b|\bfetch\s*\(|window\.location/.test(source)) {
    failures.push('Accepting usage notes must not initiate or redirect a payment')
  }
  return failures
}

function validateCustomerDialog(source) {
  const failures = []
  const condensed = compact(source)
  if (!hasExactInterfaceProperties(source, 'CustomerDetailsProps', ['value', 'onChange', 'onNext', 'onBack'])) {
    failures.push('Customer details props must contain only value, onChange, onNext and onBack')
  }
  if (!/exportfunctionCustomerDetails\(\{value,onChange,onNext,onBack,?\}:CustomerDetailsProps\)/.test(condensed)) failures.push('Customer details must export the reviewed controlled form')
  if (/DialogPrimitive\./.test(source) || /\b(?:isOpen|onClose|onAccept|onExitComplete)\b/.test(source)) failures.push('Customer details must not own dialog lifecycle')
  if (countOpeningTags(source, 'form') !== 1 || countOpeningTags(source, 'input') !== 2
    || /<(?:select|textarea)\b|\bcontentEditable\b/i.test(source)) failures.push('Customer details must contain exactly one form with two inputs')
  const sourceFile = ts.createSourceFile(customerDialogPath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const inputs = []
  function visit(node) {
    const openingElement = getJsxOpeningElement(node)
    if (openingElement?.tagName.getText() === 'input') inputs.push(openingElement)
    ts.forEachChild(node, visit)
  }
  visit(sourceFile)
  const expectedInputs = new Map([
    ['email', { type: 'email', maxLength: '254' }],
    ['whatsapp', { type: 'tel', maxLength: '40' }],
  ])
  for (const input of inputs) {
    if (input.attributes.properties.some(ts.isJsxSpreadAttribute)) {
      failures.push('Customer inputs must not use spread attributes')
      continue
    }
    const attributes = input.attributes.properties.filter(ts.isJsxAttribute)
    const attribute = (name) => attributes.find((candidate) => candidate.name.getText() === name)
    const nameAttribute = attribute('name')
    const name = nameAttribute?.initializer && ts.isStringLiteral(nameAttribute.initializer) ? nameAttribute.initializer.text : ''
    const expected = expectedInputs.get(name)
    const typeAttribute = attribute('type')
    const type = typeAttribute?.initializer && ts.isStringLiteral(typeAttribute.initializer) ? typeAttribute.initializer.text : ''
    const maxLength = attribute('maxLength')?.initializer?.getText(sourceFile).replace(/[{}]/g, '')
    const inputModeAttribute = attribute('inputMode')
    const inputMode = inputModeAttribute?.initializer && ts.isStringLiteral(inputModeAttribute.initializer) ? inputModeAttribute.initializer.text : ''
    const autocompleteAttribute = attribute('autoComplete')
    const autocomplete = autocompleteAttribute?.initializer && ts.isStringLiteral(autocompleteAttribute.initializer) ? autocompleteAttribute.initializer.text : ''
    const value = attribute('value')?.initializer?.getText(sourceFile).replace(/[{}]/g, '')
    const onChange = attribute('onChange')?.initializer?.getText(sourceFile) ?? ''
    if (!expected || type !== expected.type || inputMode !== expected.type || autocomplete !== expected.type
      || maxLength !== expected.maxLength || !attribute('required') || value !== `value.${name}`
      || !onChange.includes('onChange') || !onChange.includes(name)) {
      failures.push(`Customer input is not in the strict email/whatsapp allowlist: ${name || 'unnamed'}`)
    }
    expectedInputs.delete(name)
  }
  if (expectedInputs.size > 0) failures.push(`Customer inputs are missing: ${[...expectedInputs.keys()].join(', ')}`)
  if (!/<form[^>]*\bnoValidate\b[^>]*onSubmit=\{handleSubmit\}/.test(source)
    || !/event\.preventDefault\(\)/.test(source)
    || !/const customer\s*=\s*normalizePaymentCustomer\(value\)/.test(source)
    || !/onNext\(customer\)/.test(source)) failures.push('Customer form must prevent native submission and pass only canonical details')
  if (!/normalizeCustomerEmail\(value\.email\)/.test(source)
    || !/normalizeWhatsAppNumber\(value\.whatsapp\)/.test(source)
    || !/emailRef\.current\?\.focus\(\)/.test(source)
    || !/whatsappRef\.current\?\.focus\(\)/.test(source)) failures.push('Customer form must validate and focus the first invalid field')
  if (!/onClick=\{onBack\}/.test(source) || !/type=["']submit["']/.test(source)) failures.push('Customer form must retain Back and explicit submit controls')
  const labels = source.match(/<label\b[\s\S]*?<\/label>/g) ?? []
  if (labels.length !== 2 || labels.some((label) =>
    !/<label\b[^>]*>\s*<span\s+aria-hidden=["']true["']\s+className=["'][^"']*\bmr-1\b[^"']*\btext-red-600\b[^"']*["']\s*>\s*\*\s*<\/span>/.test(label))
    || (source.match(/aria-hidden=["']true["'][^>]*\btext-red-600\b/g)?.length ?? 0) !== 2) {
    failures.push('Both required customer labels must start with one red aria-hidden asterisk')
  }
  if (!source.includes('"+ Indicatif et numéro"') || !source.includes('"+ Code and number"')
    || /Incluez l.indicatif du pays|Include the country code|whatsapp-hint|placeholder\s*=\s*["']\+\d/i.test(source)) {
    failures.push('WhatsApp must use only the generic international placeholder without a country-code hint')
  }
  if (/\b(?:fetch|createLeekPayCheckout|requestPaymentApi|handleCheckout)\s*\(|\b(?:localStorage|sessionStorage)\b|window\.location/.test(source)) {
    failures.push('Customer details must not send, persist or place PII in a URL')
  }
  if (/\bconsole\.(?:log|info|warn|error|debug)\s*\(/.test(source)
    || /\b(?:navigator\s*\.\s*(?:geolocation|permissions)|geolocation|getCurrentPosition|watchPosition)\b/i.test(source)
    || /\b(?:password|cardNumber|card_number|cvv|otp|pan)\b/i.test(source)) {
    failures.push('Customer details must not collect or log additional personal/payment data')
  }
  return failures
}

// This one non-transactional selector is not a general form-control exemption.
// Its static choices and only handler must remain the reviewed theme preference.
function validateThemeToggleControl(source) {
  const sourceFile = ts.createSourceFile(themeTogglePath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  if (sourceFile.parseDiagnostics.length > 0) return ['Theme selector cannot be parsed']
  const failures = []
  const elements = []
  const expectedImports = new Map([
    ['lucide-react', ['Monitor', 'Moon', 'Sun']],
    ['@/lib/language-context', ['useLanguage']],
    ['@/lib/theme-context', ['readThemePreference', 'useTheme']],
  ])
  const expectedCalls = new Set([
    'useLanguage()',
    'useTheme()',
    'setPreference(readThemePreference(event.target.value))',
    'readThemePreference(event.target.value)',
  ])
  function visit(node) {
    const openingElement = getJsxOpeningElement(node)
    if (openingElement) elements.push({ node, openingElement })
    if (ts.isImportDeclaration(node)) {
      const module = ts.isStringLiteral(node.moduleSpecifier) ? node.moduleSpecifier.text : ''
      const bindings = node.importClause?.namedBindings
      const names = bindings && ts.isNamedImports(bindings)
        ? bindings.elements.map((binding) => binding.propertyName ? '' : binding.name.text).sort()
        : []
      const expected = expectedImports.get(module)
      if (!expected || node.importClause?.name || node.attributes || JSON.stringify(names) !== JSON.stringify([...expected].sort())) {
        failures.push('Theme selector may import only its reviewed icons and theme/language hooks')
      }
      expectedImports.delete(module)
    }
    if (ts.isCallExpression(node)) {
      const call = compact(node.getText(sourceFile))
      if (!expectedCalls.delete(call)) failures.push('Theme selector may call only the reviewed preference handler and hooks once')
    }
    if (ts.isNewExpression(node) || ts.isTaggedTemplateExpression(node) || ts.isExportDeclaration(node)
      || ts.isExportAssignment(node) || ts.isDeleteExpression(node)
      || ts.isPostfixUnaryExpression(node)
      || (ts.isPrefixUnaryExpression(node) && [ts.SyntaxKind.PlusPlusToken, ts.SyntaxKind.MinusMinusToken].includes(node.operator))
      || (ts.isBinaryExpression(node) && node.operatorToken.kind >= ts.SyntaxKind.FirstAssignment
        && node.operatorToken.kind <= ts.SyntaxKind.LastAssignment)) {
      failures.push('Theme selector must not construct, re-export or mutate external state')
    }
    ts.forEachChild(node, visit)
  }
  visit(sourceFile)
  if (expectedImports.size || expectedCalls.size) failures.push('Theme selector must retain the reviewed imports and preference handler')
  if (/\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon|axios|localStorage|sessionStorage|indexedDB|caches|cookie|window|document|navigator|globalThis|customer|email|whatsapp|phone|card|payment|checkout|createLeekPayCheckout|requestPaymentApi|handleCheckout|contentEditable)\b/i.test(source)) {
    failures.push('Theme selector must not collect, send or store data or interact with payment/customer state')
  }
  const selects = elements.filter(({ openingElement }) => openingElement.tagName.getText() === 'select')
  const options = elements.filter(({ openingElement }) => openingElement.tagName.getText() === 'option')
  if (selects.length !== 1 || options.length !== 3) failures.push('Theme selector must contain exactly one select with three static options')
  const allowedAttributes = new Map([
    ['label', new Set(['className', 'title'])],
    ['Icon', new Set(['size', 'aria-hidden'])],
    ['select', new Set(['aria-label', 'value', 'onChange'])],
    ['option', new Set(['value'])],
  ])
  for (const { openingElement } of elements) {
    const tag = openingElement.tagName.getText()
    const allowed = allowedAttributes.get(tag)
    const seen = new Set()
    for (const attribute of openingElement.attributes.properties) {
      const name = ts.isJsxAttribute(attribute) ? attribute.name.getText() : ''
      if (!allowed?.has(name) || seen.has(name)) failures.push('Theme selector has an unapproved or repeated JSX attribute')
      seen.add(name)
    }
    if (!allowed) failures.push('Theme selector must not contain other controls or components')
  }
  if (selects.length === 1) {
    const select = selects[0]
    const attributes = select.openingElement.attributes.properties.filter(ts.isJsxAttribute)
    const expression = (name) => attributes.find((attribute) => attribute.name.getText() === name)?.initializer
    if (compact(expression('value')?.getText(sourceFile) ?? '') !== '{preference}'
      || compact(expression('onChange')?.getText(sourceFile) ?? '') !== '{(event)=>setPreference(readThemePreference(event.target.value))}') {
      failures.push('Theme selector must change only the normalized theme preference')
    }
    if (!ts.isJsxElement(select.node) || select.node.children.some((child) =>
      !(ts.isJsxText(child) && !child.text.trim())
      && !(ts.isJsxElement(child) && child.openingElement.tagName.getText() === 'option'))) {
      failures.push('Theme selector options must be direct static children')
    }
  }
  const values = options.map(({ openingElement }) => {
    const attribute = openingElement.attributes.properties.find((item) => ts.isJsxAttribute(item) && item.name.getText() === 'value')
    return attribute?.initializer && ts.isStringLiteral(attribute.initializer) ? attribute.initializer.text : ''
  })
  if (JSON.stringify(values) !== JSON.stringify(['system', 'light', 'dark'])) failures.push('Theme selector options must be exactly system, light and dark')
  return failures
}

function validateDataCollectionControls(source, relativePath) {
  if (relativePath === themeTogglePath) return validateThemeToggleControl(source)
  if (relativePath !== customerDialogPath && /<(?:form|input|select|textarea)\b|\bcontentEditable\b/i.test(source)) {
    return [`Data-collection controls are allowed only in ${customerDialogPath}: ${relativePath}`]
  }
  return []
}

function validateProviderDialog(source) {
  const failures = []
  const condensed = compact(source)
  if (!/exportfunctionPaymentProviders\(\{card,customer,onBack,?\}:PaymentProvidersProps\)/.test(condensed)) failures.push('Providers must export the reviewed card/customer/back fragment')
  if (!hasExactInterfaceProperties(source, 'PaymentProvidersProps', ['card', 'customer', 'onBack'])) failures.push('Provider props must contain only card, customer and onBack')
  if (/DialogPrimitive\.(?:Root|Portal|Overlay|Content)\b/.test(source)) failures.push('Providers must not create a nested Radix dialog')
  if (/\b(?:isOpen|onClose|onAccept|onOpenChange|handleClose)\b/.test(source)) failures.push('Providers must not receive or manage dialog lifecycle props')
  if (!/type\s*\{\s*PaymentCustomer\s*\}\s*from\s*["']@\/lib\/payment-customer["']/.test(source)) failures.push('Providers must receive the canonical PaymentCustomer type')
  if (!/createLeekPayCheckout/.test(source) || !/from\s*["']@\/lib\/leekpay["']/.test(source)) failures.push('Provider dialog must use the reviewed REST adapter')
  if (!/createLeekPayCheckout\(\s*card\.id,\s*customer,\s*controller\.signal,?\s*\)/.test(source)) failures.push('Provider dialog must send only the selected product and canonical customer')
  if (!/window\.location\.assign\(checkout\.checkoutUrl\)/.test(source)) failures.push('Provider dialog must navigate only to the validated checkout URL')
  if (!/\bLeekPay\b/.test(source)) failures.push('Provider dialog must identify LeekPay')
  if (!/window\.addEventListener\(["']pageshow["']/.test(source)
    || !/window\.removeEventListener\(["']pageshow["']/.test(source)
    || !/requestRef\.current\?\.abort\(\)/.test(source)
    || !/\},\s*\[\]\s*\);/.test(source)) failures.push('Providers must clean up checkout requests and pageshow handling on unmount')
  if (!/disabled=\{isProcessing\}onClick=\{onBack\}type=["']button["']/.test(condensed)) failures.push('Provider Back control must be disabled during checkout')
  const checkoutActionCount = source.match(/onClick=\{handleCheckout\}/g)?.length ?? 0
  if (checkoutActionCount !== 1 || source.indexOf('onClick={handleCheckout}') < source.indexOf('</fieldset>')
    || !/disabled=\{isProcessing\}onClick=\{handleCheckout\}type=["']button["']/.test(condensed)
    || (source.match(/createLeekPayCheckout\s*\(/g)?.length ?? 0) !== 1
    || (source.match(/\bhandleCheckout\b/g)?.length ?? 0) !== 2) {
    failures.push('Only the separate global Pay button may start checkout')
  }
  if (/customer\.(?:email|whatsapp)|\b(?:localStorage|sessionStorage)\b/.test(source)
    || /\bconsole\.(?:log|info|warn|error|debug)\s*\([^)]*(?:customer|email|whatsapp|phone)/i.test(source)) failures.push('Providers must pass customer details opaquely without storing or logging them')
  if (/<(?:form|input|select|textarea)\b|\bcontentEditable\b/i.test(source)) failures.push('Provider dialog must not collect input')
  if (/\b(?:customerEmail|customerName|customerPhone|customer_email|customer_name|customer_phone|cardNumber|card_number|cvv|pan)\b/i.test(source)) failures.push('Provider dialog must not collect personal/card data')
  if (/\bfetch\s*\(/.test(source)) failures.push('Provider dialog must not bypass the REST adapter')
  return failures
}

function validateCheckoutDialog(source) {
  const failures = []
  const condensed = compact(source)
  const signature = condensed.match(/exportfunctionDialogCheckout\(\{(?:card,onClose(?::([A-Za-z_$][\w$]*))?|onClose(?::([A-Za-z_$][\w$]*))?,card),?\}:DialogCheckoutProps\)/)
  if (!signature) {
    failures.push('Checkout dialog must export the card/onClose wrapper')
  }
  if (!hasExactInterfaceProperties(source, 'DialogCheckoutProps', ['card', 'onClose'])) failures.push('Checkout dialog props must contain only card and onClose')
  if (!/typeCheckoutStep=["']notes["']\|["']customer["']\|["']providers["'];?/.test(condensed)
    || !/useState<CheckoutStep>\(["']notes["']\)/.test(condensed)) failures.push('Checkout dialog must start at usage notes')
  if (!/useState<PaymentCustomer>\(\{email:["']["'],whatsapp:["']["'],?\}\)/.test(condensed)
    || !/constvalidCustomer=normalizePaymentCustomer\(customer\)/.test(condensed)) failures.push('Checkout dialog must keep a controlled customer draft and canonical value')
  for (const primitive of ['Root', 'Portal', 'Overlay', 'Content']) {
    const count = countOpeningTags(source, `DialogPrimitive.${primitive}`)
    if (count !== 1) failures.push(`Checkout dialog must contain exactly one Radix ${primitive} (found ${count})`)
  }
  if (countOpeningTags(source, 'DialogPrimitive.Description') !== 1) failures.push('Checkout dialog must own one persistent accessible description')
  if (!/<DialogPrimitive\.Rootopen(?:=\{isOpen\})?onOpenChange=/.test(condensed)) failures.push('Checkout dialog must open its single Radix root, optionally controlled by its local close animation')
  if (!/onOpenChange=\{\(open\)=>\{if\(!open\)onClose\(\);?\}\}/.test(condensed)) failures.push('Checkout dialog dismiss must call onClose')
  if (!/<UsageNotesonAccept=\{\(\)=>\{setStep\(["']customer["']\);setLocationRequested\(true\);?\}\}onClose=\{onClose\}\/>/.test(condensed)) {
    failures.push('Usage-notes acceptance must advance to customer details and enable one location lookup')
  }
  if (!/<CustomerDetailsvalue=\{customer\}onChange=\{\(details\)=>\{if\(details\.whatsapp!==customer\.whatsapp\)whatsappEditedRef\.current=true;setCustomer\(details\);?\}\}onNext=\{\(details\)=>\{setCustomer\(details\);setStep\(["']providers["']\);?\}\}onBack=\{\(\)=>setStep\(["']notes["']\)\}\/>/.test(condensed)) {
    failures.push('Customer details must control the draft and advance only canonical details')
  }
  if (!/validCustomer\?\(?<PaymentProviderscard=\{card\}customer=\{validCustomer\}onBack=\{\(\)=>setStep\(["']customer["']\)\}\/?>\)?:null/.test(condensed)) {
    failures.push('Providers must receive a valid customer and retain a Back path')
  }
  if (!/step===["']notes["']\?\(?<UsageNotes/.test(condensed)) failures.push('Provider selection must remain gated behind the notes step')
  if (!/from\s*["']@\/lib\/customer-location["']/.test(source)
    || !/const\[locationRequested,setLocationRequested\]=useState\(false\)/.test(condensed)
    || !/constwhatsappEditedRef=useRef\(false\)/.test(condensed)
    || (source.match(/\bsetLocationRequested\s*\(/g)?.length ?? 0) !== 1
    || (source.match(/\bdetectCustomerLocation\s*\(/g)?.length ?? 0) !== 1) {
    failures.push('Checkout must request the calling code at most once after consent')
  }
  const locationEffectStart = condensed.indexOf('useEffect(()=>{if(!locationRequested)return;')
  const locationEffectEnd = condensed.indexOf('},[locationRequested]);', locationEffectStart)
  const locationEffect = locationEffectStart >= 0 && locationEffectEnd > locationEffectStart
    ? condensed.slice(locationEffectStart, locationEffectEnd + '},[locationRequested]);'.length)
    : ''
  if (!locationEffect
    || !/constcontroller=newAbortController\(\)/.test(locationEffect)
    || !/voiddetectCustomerLocation\(controller\.signal\)\.then\(\(location\)=>\{/.test(locationEffect)
    || !/if\(!location\|\|controller\.signal\.aborted\)return/.test(locationEffect)
    || !/setCustomer\(\(current\)=>whatsappEditedRef\.current\|\|current\.whatsapp\?current:\{\.\.\.current,whatsapp:location\.callingCode\},?\)/.test(locationEffect)
    || !/return\(\)=>controller\.abort\(\)/.test(locationEffect)
    || /setStep|setLocationRequested|\bfetch\s*\(/.test(locationEffect)) {
    failures.push('Calling-code lookup must be abortable and must never overwrite a touched or existing WhatsApp value')
  }
  if (/\b(?:createLeekPayCheckout|requestPaymentApi|handleCheckout)\b|\bfetch\s*\(|window\.location/.test(source)) {
    failures.push('Checkout step transitions must not initiate or redirect a payment')
  }
  if (/\b(?:navigator\s*\.\s*(?:geolocation|permissions)|geolocation|getCurrentPosition|watchPosition)\b/i.test(source)
    || /\b(?:localStorage|sessionStorage|indexedDB|document\.cookie)\b/.test(source)
    || /\bconsole\.(?:log|info|warn|error|debug)\s*\(/.test(source)) {
    failures.push('Checkout location prefilling must not use GPS, persistence or logs')
  }
  if (/\b(?:onExitComplete|notes-exiting|checkoutStep|DialogNotes|DialogProviders)\b/.test(source)) failures.push('Checkout wrapper must not restore the previous multi-dialog lifecycle')
  // Local presence state is permitted only for the unified, guarded close path.
  // In particular, removing the live panel must begin immediately so its
  // useIsPresent effects can abort payment before the dialog fade completes.
  const closeAlias = signature?.[1] ?? signature?.[2]
  if (/\bisOpen\b/.test(source) || closeAlias) {
    if (!closeAlias
      || !/const\[isOpen,setIsOpen\]=useState\(true\)/.test(condensed)
      || !/<DialogPrimitive\.Rootopen=\{isOpen\}onOpenChange=/.test(condensed)
      || !/<AnimatePresenceinitial=\{false\}mode=["']wait["']>\{isOpen&&\(?<CheckoutPanel/.test(condensed)
      || !/useLayoutEffect\(\(\)=>\{if\(dialogElement\)dialogElement\.inert=!isOpen;?\},\[dialogElement,isOpen\]\)/.test(condensed)) {
      failures.push('Animated checkout must control one root and immediately remove/inert its live panel when closing')
    }
    if (!/constcloseRequestedRef=useRef\(false\)/.test(condensed)
      || !/constcloseFinishedRef=useRef\(false\)/.test(condensed)
      || !condensed.includes(`constonClosedRef=useRef(${closeAlias})`)
      || !condensed.includes(`onClosedRef.current=${closeAlias};`)
      || !/constfinishClose=useCallback\(\(\)=>\{if\(!closeRequestedRef\.current\|\|closeFinishedRef\.current\)return;closeFinishedRef\.current=true;onClosedRef\.current\(\);?\},\[\]\)/.test(condensed)
      || !/constonClose=useCallback\(\(\)=>\{if\(closeRequestedRef\.current\)return;closeRequestedRef\.current=true;setIsOpen\(false\);if\(reducedMotion\)finishClose\(\);?\},\[finishClose,reducedMotion\]\)/.test(condensed)
      || (source.match(/\bsetIsOpen\s*\(/g)?.length ?? 0) !== 1
      || (source.match(/onClosedRef\.current\s*\(/g)?.length ?? 0) !== 1) {
      failures.push('Animated checkout must request and finish closure once, with immediate reduced-motion dismissal')
    }
    const timeout = condensed.match(/consttimeout=window\.setTimeout\(finishClose,reducedMotion\?0:(\d+)\)/)
    if (!timeout || Number(timeout[1]) < 1 || Number(timeout[1]) > 300
      || !/useEffect\(\(\)=>\{if\(isOpen\)return;/.test(condensed)
      || !/return\(\)=>window\.clearTimeout\(timeout\);?\},\[finishClose,isOpen,reducedMotion\]\)/.test(condensed)
      || !/onAnimationEnd=\{\(event\)=>\{if\(event\.target===event\.currentTarget&&!isOpen&&/.test(condensed)) {
      failures.push('Animated checkout must finish on its own exit event with a cleaned-up, bounded fallback')
    }
  }
  if (!/useReducedMotion\(\)\s*===\s*true/.test(source)
    || !/<DialogPrimitive\.Content\b[\s\S]*?\basChild\b/.test(source)
    || !/layout=\{reducedMotion\?false:["']size["']\}/.test(condensed)
    || !/<AnimatePresenceinitial=\{false\}mode=["']wait["']>/.test(condensed)
    || !/<CheckoutPanelkey=\{step\}reducedMotion=\{reducedMotion\}>/.test(condensed)
    || (source.match(/key=\{step\}/g)?.length ?? 0) !== 1) failures.push('Checkout dialog must retain reduced-motion-aware wait/layout transitions keyed only at the panel')
  if (!/constisPresent=useIsPresent\(\)/.test(condensed)
    || !/constpanelRef=useRef<HTMLDivElement>\(null\)/.test(condensed)
    || !/useLayoutEffect\(\(\)=>\{if\(panelRef\.current\)panelRef\.current\.inert=!isPresent;?\},\[isPresent\]\)/.test(condensed)
    || !/aria-hidden=\{!isPresent\|\|undefined\}/.test(condensed)
    || !/ref=\{panelRef\}/.test(condensed)) failures.push('Exiting checkout panels must be reactively inert and hidden from assistive technology')
  if (!/titleRef\.current\?\.focus\([^)]*\)/.test(source) || !/\},\s*\[step\]\s*\);/.test(source)) failures.push('Checkout heading focus must follow committed step changes')
  return failures
}

function validateCatalogueFlow(source) {
  const failures = []
  const condensed = compact(source)
  if (!/from["']@\/components\/ui\/dialog-checkout["']/.test(condensed) || !/<DialogCheckout\b/.test(source)) failures.push('Catalogue must use the unified checkout dialog')
  if (!/selectedCard&&\(<DialogCheckout[\s\S]*?onClose=\{\(\)=>setSelectedCard\(null\)\}/.test(condensed)) failures.push('Catalogue must mount checkout for the selected card with an explicit close path')
  if (/\b(?:checkoutStep|setCheckoutStep|notes-exiting|DialogNotes|DialogProviders|UsageNotes|PaymentProviders)\b/.test(source)) {
    failures.push('Catalogue must not manage checkout dialog steps or fragments')
  }
  if (/\b(?:createLeekPayCheckout|requestPaymentApi|handleCheckout)\b|\bfetch\s*\(/.test(source)) failures.push('Selecting a catalogue card must not initiate payment')
  return failures
}

function validatePaymentResult(source, receiptSource) {
  const failures = []
  for (const symbol of ['getLeekPayOrderStatus', 'readOrderToken']) {
    if (!source.includes(symbol)) failures.push(`Payment result must use ${symbol}`)
  }
  if (!/readOrderToken\(window\.location\.hash\)/.test(source)) failures.push('Payment result must read the opaque order token from location.hash only')
  if (/\b(?:URLSearchParams|searchParams)\b|window\.location\.search/.test(source)) failures.push('Payment result must not read an order token or payment state from the URL query')
  if (!/result\.status\s*===\s*["']paid["']\s*&&\s*result\.verified\s*===\s*true/.test(source)) failures.push('Payment result may show paid only for verified:true paid status')
  if (!/verification\s*===\s*["']paid["']\s*&&\s*order\?\.verified\s*===\s*true/.test(source)) failures.push('Paid rendering must remain gated by verified order state')
  if (!/setTimeout\(poll/.test(source) || !/Math\.min\(delay\s*\*\s*2/.test(source)) failures.push('Payment result must retain bounded retry/backoff for eventual KV visibility')
  if (!/if\(\(isPaid&&order\)\|\|isSimulation\)\{return\(/.test(compact(source))
    || !/<PaymentReceipt\b/.test(source)) failures.push('Only a verified payment or local simulation may render the receipt')
  if (!/amount=\{isPaid&&order\?order\.amount:5000\}/.test(compact(source))
    || !/createdAt=\{isPaid&&order\?order\.createdAt:Date\.UTC\(2026,8,5,12\)\}/.test(compact(source))) failures.push('Real receipts must use the verified order amount and stored creation date')
  if (!/Une fois votre compte créé et vérifié/.test(receiptSource)
    || !/envoyez-nous l’adresse e-mail associée par Telegram en priorité, ou par WhatsApp/.test(receiptSource)
    || !/Nous procéderons alors à l’ajout de la carte dans votre compte/.test(receiptSource)) failures.push('Receipt must explain the separate manual card fulfillment steps')
  if (/\b(?:autoFulfill|fulfillOrder|issueCard|issueVirtualCard|provisionCard|deliverCard|revealCard|generateCard|activateCard)\s*\(/i.test(source)) failures.push('Payment result must never auto-fulfill cards')
  return failures
}

function validateWorkerLocation(source) {
  const failures = []
  const condensed = compact(source)
  if (!/import\{getCountryCallingCode,isSupportedCountry\}from["']libphonenumber-js["'];?/.test(condensed)) {
    failures.push('Worker location lookup must use libphonenumber-js')
  }
  if ((source.match(/["']\/api\/location["']/g)?.length ?? 0) !== 1) {
    failures.push('Worker must expose exactly one /api/location route')
  }
  const responseStart = source.indexOf('function locationResponse')
  const responseEnd = source.indexOf('async function', responseStart)
  const responseBlock = responseStart >= 0 && responseEnd > responseStart
    ? source.slice(responseStart, responseEnd)
    : ''
  if (!responseBlock
    || !/const country:\s*unknown\s*=\s*request\.cf\?\.country/.test(responseBlock)
    || !/\^\[A-Z\]\{2\}\$/.test(responseBlock)
    || !/!isSupportedCountry\(country\)/.test(responseBlock)
    || !/jsonResponse\(\{\s*countryCode:\s*null,\s*callingCode:\s*null\s*\},\s*200,\s*origin\)/.test(responseBlock)
    || !/jsonResponse\(\{\s*countryCode:\s*country,\s*callingCode:\s*`\+\$\{getCountryCallingCode\(country\)\}`\s*\},\s*200,\s*origin\)/.test(responseBlock)) {
    failures.push('Worker must derive only a validated calling code from request.cf.country')
  }
  if (/headers\.get\s*\(\s*["'][^"']*(?:country|location)/i.test(responseBlock)
    || /\b(?:city|region|postal|timezone|latitude|longitude|coordinates|geolocation|address)\b/i.test(responseBlock)
    || /\b(?:console\.|ORDERS|LEEKPAY_SECRET_KEY|providerJson|requestJson|localStorage|sessionStorage)\b/.test(responseBlock)) {
    failures.push('Worker location response must not trust client hints, expose detailed location, store, log or call the provider')
  }
  const routeStart = source.indexOf('if (url.pathname === "/api/location")')
  const routeEnd = source.indexOf('const create =', routeStart)
  const routeBlock = routeStart >= 0 && routeEnd > routeStart ? source.slice(routeStart, routeEnd) : ''
  if (!routeBlock
    || !/if \(url\.search\) throw new ApiError\(404, "not_found"\)/.test(routeBlock)
    || !/if \(!origin\) throw new ApiError\(403, "origin_forbidden"\)/.test(routeBlock)
    || !/Access-Control-Request-Method"\) !== "GET"/.test(routeBlock)
    || !/request\.method !== "GET"/.test(routeBlock)
    || !/await enforceRateLimit\(request, env, false\)/.test(routeBlock)
    || !/return locationResponse\(request, origin\)/.test(routeBlock)
    || /\b(?:serviceReady|providerJson|ORDERS|LEEKPAY_SECRET_KEY|requestJson)\b/.test(routeBlock)) {
    failures.push('Worker location route must be origin-checked, GET-only, queryless, rate-limited and independent from payment state')
  }
  return failures
}

function validateWorkerPackage(source) {
  const failures = []
  let manifest
  try {
    manifest = JSON.parse(source)
  } catch {
    return ['Worker package.json must be valid JSON']
  }
  if (manifest?.dependencies?.['libphonenumber-js'] !== '1.13.12') {
    failures.push('Worker must pin the reviewed libphonenumber-js dependency')
  }
  return failures
}

function validateWorkerCustomerForwarding(source) {
  const failures = []
  if ((source.match(/\bcustomer_email\b/g)?.length ?? 0) !== 1
    || (source.match(/\bcustomer_phone\b/g)?.length ?? 0) !== 1
    || (source.match(/\bcustomer_name\b/g)?.length ?? 0) !== 1
    || !/customer_email:\s*customer\.email/.test(source)
    || !/customer_phone:\s*customer\.whatsapp/.test(source)
    || !/customer_name:\s*`Client \(\$\{customer\.email\}\)`/.test(source)) {
    failures.push('Worker may forward customer details only as exact LeekPay email/phone and derived Client (email) name fields')
  }
  if (/\b(?:customer|payload\.customer)\.name\b|\bcustomerName\b/.test(source)) {
    failures.push('Worker must not accept or derive a separate customer name')
  }
  return failures
}

function validateWorkerSource(source) {
  const failures = []
  if ((source.split(providerCheckoutApi).length - 1) !== 1) failures.push(`Worker must declare the exact LeekPay REST endpoint once: ${providerCheckoutApi}`)
  failures.push(...validateWorkerUrls(source))
  failures.push(...validateWorkerLocation(source))
  if (!/import\s*\{\s*normalizePaymentCustomer\s*\}\s*from\s*["']\.\.\/\.\.\/src\/lib\/payment-customer\.ts["']/.test(source)
    || !/const customer\s*=\s*normalizePaymentCustomer\(payload\.customer\)/.test(source)) failures.push('Worker must revalidate customer details with the shared canonical validator')
  if (!/env\.LEEKPAY_SECRET_KEY/.test(source) || !/Authorization:\s*`Bearer \$\{env\.LEEKPAY_SECRET_KEY\}`/.test(source)) failures.push('Worker must authenticate LeekPay calls with env.LEEKPAY_SECRET_KEY')
  if (/\bXAF\b/.test(source) || !/CURRENCY\s*=\s*["']XOF["']/.test(source)) failures.push('Worker must use XOF only')
  const products = [
    ['visa-basic', 5000],
    ['mastercard-basic', 6000],
    ['mastercard-premium', 8500],
    ['mastercard-platinum', 15000],
  ]
  for (const [productId, amount] of products) {
    if (!new RegExp(`["']${productId}["']\\s*:\\s*\\{[^}]{0,160}amount:\\s*${amount}\\b`).test(source)) failures.push(`Worker catalogue is missing fixed product ${productId}/${amount} XOF`)
  }
  for (const binding of ['ORDERS', 'CREATE_LIMITER', 'STATUS_LIMITER']) {
    if (!new RegExp(`env\\.${binding}\\b`).test(source)) failures.push(`Worker does not use ${binding}`)
  }
  if (!source.includes('"/api/checkout"') || !source.includes('"/api/orders/status"')) failures.push('Worker must expose the two reviewed payment routes')
  if (!/request\.method\s*!==\s*["']POST["']/.test(source)) failures.push('Worker payment routes must reject non-POST methods')
  if (!/Object\.keys\(payload\)\.length\s*!==\s*2/.test(source)
    || !/Object\.hasOwn\(payload,\s*["']productId["']\)/.test(source)
    || !/Object\.hasOwn\(payload,\s*["']customer["']\)/.test(source)
    || !/isProductId\(payload\.productId\)/.test(source)) failures.push('Worker checkout must accept only one known productId and one customer object')
  failures.push(...validateWorkerCustomerForwarding(source))
  if (!/\^\[a-f0-9\]\{64\}\$/.test(source) || !/crypto\.getRandomValues\(new Uint8Array\(32\)\)/.test(source)) failures.push('Worker order tokens must be random 32-byte lowercase hex values')
  if (!/payment-success\/#order=\$\{orderToken\}/.test(source) || !/payment-failure\/#order=\$\{orderToken\}/.test(source)) failures.push('Worker must generate static success/cancel fragment URLs')
  if (!/env\.ORDERS\.put/.test(source) || !/expirationTtl:\s*ORDER_TTL_SECONDS/.test(source)
    || !/env\.ORDERS\.get/.test(source)) failures.push('Worker must persist expiring order records in ORDERS KV')
  for (const field of ['checkoutId', 'productId', 'amount', 'currency']) {
    if (!new RegExp(`stored\\.${field}|${field}:`).test(source)) failures.push(`Worker order verification is missing ${field}`)
  }
  if (!/data\.id\s*!==\s*stored\.checkoutId/.test(source)
    || !/data\.amount\s*!==\s*stored\.amount/.test(source)
    || !/data\.currency\s*!==\s*stored\.currency/.test(source)) failures.push('Worker must compare provider id, amount and currency with the stored order')
  if (!/verified:\s*data\.status\s*===\s*["']paid["']/.test(source)) failures.push('Worker may set verified true only from authenticated paid status')
  if (!/checkoutId\s*\?\s*["']GET["']\s*:\s*["']POST["']/.test(source)) failures.push('Worker must use authenticated GET for stored checkout status')
  if (!/redirect:\s*["']manual["']/.test(source) || /redirect:\s*["']error["']/.test(source)) failures.push('Worker must inspect manual redirects without forwarding its Authorization header')
  if (!/safeCheckoutUrl\(data\.payment_url\)/.test(source)) failures.push('Worker must validate the provider checkout URL before returning it')
  if (!/REQUEST_LIMIT_BYTES/.test(source) || !/PROVIDER_LIMIT_BYTES/.test(source) || !/AbortController/.test(source)) failures.push('Worker must bound request/provider bodies and upstream time')
  const orderType = source.match(/type\s+Order\s*=\s*\{([\s\S]*?)\};/)?.[1] ?? ''
  if (/\b(?:customer|email|whatsapp|phone)\b/i.test(orderType)
    || !/JSON\.stringify\(order\)/.test(source)) failures.push('Worker must not persist customer PII in ORDERS KV')
  for (const metadata of source.matchAll(/\bmetadata\s*:\s*\{([^}]*)\}/g)) {
    if (/\b(?:customer|email|whatsapp|phone)\b/i.test(metadata[1])) failures.push('Worker must not copy customer PII into provider metadata')
  }
  if (/\bconsole\.(?:log|info|warn|error|debug)\s*\([\s\S]{0,400}?(?:customer|email|whatsapp|phone)/i.test(source)) failures.push('Worker must not log customer PII')
  if (/(?:return_url|cancel_url|returnUrl)\s*[:=][^,}\n]*(?:customer|email|whatsapp|phone)/i.test(source)
    || /(?:URLSearchParams|url\.searchParams)[\s\S]{0,160}(?:customer|email|whatsapp|phone)/i.test(source)) failures.push('Worker must not place customer PII in callback URLs')
  if (/\b(?:customer_address|card_number|cardNumber|cvv|otp|pan)\b/i.test(source)) failures.push('Worker must not collect or transmit additional personal/card data')
  if (/\b(?:autoFulfill|fulfillOrder|issueCard|issueVirtualCard|provisionCard|deliverCard|revealCard|generateCard|activateCard)\s*\(/i.test(source)) failures.push('Worker must never auto-fulfill cards')
  return failures
}

function validateWorkerConfig(source) {
  const failures = []
  if (!/"main"\s*:\s*"src\/index\.ts"/.test(source)) failures.push('Wrangler main must be worker/src/index.ts')
  for (const binding of ['ORDERS', 'CREATE_LIMITER', 'STATUS_LIMITER']) {
    if (!new RegExp(`["'](?:binding|name)["']\\s*:\\s*["']${binding}["']`).test(source)) failures.push(`Wrangler binding is missing: ${binding}`)
  }
  if (!/"required"\s*:\s*\[\s*"LEEKPAY_SECRET_KEY"\s*\]/.test(source)) failures.push('Wrangler must declare LEEKPAY_SECRET_KEY as a required secret')
  if (/"LEEKPAY_SECRET_KEY"\s*:/.test(source) || providerCredentialPattern.test(source)) failures.push('Wrangler must not contain a payment credential value')
  return failures
}

function selfTest() {
  const secretOne = `aB3_${'cD4e'.repeat(6)}`
  const secretTwo = `9zY-${'8xWv'.repeat(6)}`
  const providerSecret = `${['sk', 'live'].join('_')}_${'A7bC'.repeat(8)}`
  const envSource = [
    `API_KEY=${secretOne}`,
    `export TOKEN='${secretTwo}'`,
    'LEEKPAY_SECRET_KEY=replace-with-development-credential',
    'TOKEN=${RUNTIME_TOKEN}',
  ].join('\n')
  assert.deepEqual(findEnvironmentCredentials(envSource).map(({ key, line }) => ({ key, line })), [
    { key: 'API_KEY', line: 1 },
    { key: 'TOKEN', line: 2 },
  ])
  assert.ok(providerCredentialPattern.test(providerSecret))
  assert.ok(publicCredentialReferencePattern.test('NEXT_PUBLIC_PAYMENT_API_KEY'))
  assert.ok(matchingRules('currency: "XAF"', forbiddenFrontendPatterns).some((rule) => rule.label === 'legacy XAF currency'))
  assert.ok(matchingRules('window.LeekPay.checkout({})', forbiddenFrontendPatterns).some((rule) => rule.label === 'legacy LeekPay browser SDK'))
  assert.ok(matchingRules('node.innerHTML = untrusted', forbiddenFrontendPatterns).some((rule) => rule.label === 'HTML injection sink'))
  assert.equal(matchingRules('node.innerHTML = frameworkHtml', forbiddenOutputPatterns).some((rule) => rule.label === 'HTML injection sink'), false)
  assert.ok(validateFrontendUrls(`const url = '${providerCheckoutApi}'`, frontendAdapterPath).length > 0)
  assert.deepEqual(validateFrontendUrls(`const url = '${proxyOrigin}'`, frontendAdapterPath), [])

  const safeNotes = `
    interface UsageNotesProps { onClose: () => void; onAccept: () => void; }
    export function UsageNotes({ onClose, onAccept }: UsageNotesProps) {
      return <><p>Notes</p><Button type="button" onClick={onAccept}>Accept</Button><Button type="button" onClick={onClose}>Refuser / Decline</Button></>
    }
  `
  assert.deepEqual(validateUsageNotesButtons(safeNotes, 'notes.tsx'), [])
  assert.deepEqual(validateUsageNotesStructure(safeNotes), [])
  assert.ok(validateUsageNotesButtons(safeNotes.replace('onClick={onClose}', 'disabled'), 'notes.tsx').length > 0)
  assert.ok(validateUsageNotesStructure(`${safeNotes}\n<DialogPrimitive.Root />`).length > 0)

  const safeCustomerLibrary = `
    export interface PaymentCustomer { readonly email: string; readonly whatsapp: string; }
    export function normalizeCustomerEmail(value: unknown) {
      let email = ""; let local = ""; let code = 64;
      if (email.length > 254 || local.length > 64 || code < 32 || code > 126) return null;
      return email;
    }
    export function normalizeWhatsAppNumber(value: unknown) {
      const whatsapp = String(value); return /^\\+[1-9][0-9]{7,14}$/.test(whatsapp) ? whatsapp : null;
    }
    export function normalizePaymentCustomer(value: unknown) {
      const keys = Reflect.ownKeys(value); if (keys.length !== 2 || !keys.includes("email") || !keys.includes("whatsapp")) return null;
      const email = normalizeCustomerEmail(value.email); const whatsapp = normalizeWhatsAppNumber(value.whatsapp);
      return { email, whatsapp };
    }
  `
  assert.deepEqual(validatePaymentCustomer(safeCustomerLibrary), [])
  assert.ok(validatePaymentCustomer(safeCustomerLibrary.replace('readonly whatsapp: string;', 'readonly whatsapp: string; readonly name: string;')).length > 0)

  const safeCustomerDialog = `
    interface CustomerDetailsProps { value: PaymentCustomer; onChange: (value: PaymentCustomer) => void; onNext: (value: PaymentCustomer) => void; onBack: () => void; }
    export function CustomerDetails({ value, onChange, onNext, onBack }: CustomerDetailsProps) {
      const emailInvalid = !normalizeCustomerEmail(value.email); const whatsappInvalid = !normalizeWhatsAppNumber(value.whatsapp);
      const handleSubmit = (event) => { event.preventDefault(); const customer = normalizePaymentCustomer(value); if (!customer) { if (!normalizeCustomerEmail(value.email)) emailRef.current?.focus(); else whatsappRef.current?.focus(); return; } onNext(customer); };
      return <form noValidate onSubmit={handleSubmit}>
        <label><span aria-hidden="true" className="mr-1 text-red-600">*</span>Email</label>
        <input name="email" type="email" inputMode="email" autoComplete="email" required maxLength={254} value={value.email} onChange={(event) => onChange({ ...value, email: event.target.value })} />
        <label><span aria-hidden="true" className="mr-1 text-red-600">*</span>WhatsApp</label>
        <input name="whatsapp" type="tel" inputMode="tel" autoComplete="tel" required maxLength={40} placeholder={language === "fr" ? "+ Indicatif et numéro" : "+ Code and number"} value={value.whatsapp} onChange={(event) => onChange({ ...value, whatsapp: event.target.value })} />
        <Button onClick={onBack} type="button">Back</Button><Button type="submit">Next</Button>
      </form>;
    }
  `
  assert.deepEqual(validateCustomerDialog(safeCustomerDialog), [])
  assert.ok(validateCustomerDialog(safeCustomerDialog.replace('</form>', '<input name="name" type="text" required maxLength={80} /></form>')).length > 0)
  assert.ok(validateCustomerDialog(safeCustomerDialog.replace('aria-hidden="true"', 'aria-hidden="false"')).length > 0)

  const safeThemeToggle = `
    import { Monitor, Moon, Sun } from "lucide-react";
    import { useLanguage } from "@/lib/language-context";
    import { readThemePreference, useTheme } from "@/lib/theme-context";
    export default function ThemeToggle() {
      const { language } = useLanguage();
      const { preference, setPreference } = useTheme();
      const Icon = preference === "system" ? Monitor : preference === "dark" ? Moon : Sun;
      return <label className="theme-toggle"><Icon size={18} aria-hidden="true" />
        <select aria-label={language === "fr" ? "Thème" : "Theme"} value={preference}
          onChange={(event) => setPreference(readThemePreference(event.target.value))}>
          <option value="system">System</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </label>;
    }
  `
  assert.deepEqual(validateDataCollectionControls(safeThemeToggle, themeTogglePath), [])
  assert.deepEqual(validateDataCollectionControls(safeThemeToggle.replace('className="theme-toggle"', 'className="theme-toggle dark:text-white"'), themeTogglePath), [])
  assert.ok(validateDataCollectionControls(safeThemeToggle, 'src/components/layout/OtherToggle.tsx').length > 0)
  assert.ok(validateDataCollectionControls(safeThemeToggle, `${themeTogglePath}.bak`).length > 0)
  for (const mutation of [
    safeThemeToggle.replace('</label>', '<input /></label>'),
    safeThemeToggle.replace('</label>', '<textarea /></label>'),
    safeThemeToggle.replace('</label>', '<form /></label>'),
    safeThemeToggle.replace('</label>', '<select /></label>'),
    safeThemeToggle.replace('</label>', '<CustomInput /></label>'),
    safeThemeToggle.replace('<label ', '<label contentEditable '),
    safeThemeToggle.replace('<select ', '<select {...extra} '),
    safeThemeToggle.replace('<select ', '<select onBlur={onChange} '),
    safeThemeToggle.replace('<select ', '<select name="email" '),
    safeThemeToggle.replace('<option value="dark">', '<option value="dark" onClick={onChange}>'),
    safeThemeToggle.replace('value="dark"', 'value="customer"'),
    safeThemeToggle.replace('value="dark"', 'value="light"'),
    safeThemeToggle.replace('value="dark"', 'value={preference}'),
    safeThemeToggle.replace('</select>', '<option value="other">Other</option></select>'),
    safeThemeToggle.replace('</select>', '{extraOptions}</select>'),
    safeThemeToggle.replace('</select>', '{true && <option value="dark">Other</option>}</select>'),
    safeThemeToggle.replace('value={preference}', 'value={customer.email}'),
    safeThemeToggle.replace('setPreference(readThemePreference(event.target.value))', 'setPreference(event.target.value)'),
    safeThemeToggle.replace('onChange={(event) => setPreference(readThemePreference(event.target.value))}', 'onChange={handleCheckout}'),
    safeThemeToggle.replace('from "@/lib/theme-context"', 'from "./unreviewed-context"'),
    safeThemeToggle.replace('import { Monitor, Moon, Sun }', 'import { Monitor, Moon, Sun, send }'),
    safeThemeToggle.replace('return <label', 'fetch("/api/checkout"); return <label'),
    safeThemeToggle.replace('return <label', 'createLeekPayCheckout(); return <label'),
    safeThemeToggle.replace('return <label', 'localStorage.setItem("theme", preference); return <label'),
    safeThemeToggle.replace('return <label', 'const storage = globalThis["localStorage"]; return <label'),
    safeThemeToggle.replace('return <label', 'new WebSocket("wss://example.invalid"); return <label'),
    safeThemeToggle.replace('return <label', 'preference.current = "dark"; return <label'),
  ]) {
    assert.ok(validateDataCollectionControls(mutation, themeTogglePath).length > 0, 'Theme-only exception must reject unreviewed collection or effects')
  }
  assert.deepEqual(validateDataCollectionControls('<form><input /></form>', customerDialogPath), [])
  assert.ok(validateDataCollectionControls('<select />', 'src/app/page.tsx').length > 0)
  assert.ok(validateDataCollectionControls('<input />', providerDialogPath).length > 0)

  const safeCustomerLocation = `
    import { LEEKPAY_API_BASE } from "./leekpay.ts";
    export interface CustomerLocation { readonly countryCode: string; readonly callingCode: string; }
    const MAX_RESPONSE_BYTES = 1024;
    async function read(response, signal) { return response.body?.getReader(); }
    export async function detectCustomerLocation(signal?: AbortSignal): Promise<CustomerLocation | null> {
      if (signal?.aborted) return null;
      const controller = new AbortController(); const abort = () => controller.abort();
      signal?.addEventListener("abort", abort, { once: true }); const timeout = setTimeout(abort, 4000);
      try {
        const response = await fetch(\`\${LEEKPAY_API_BASE}/api/location\`, { method: "GET", headers: { Accept: "application/json" }, credentials: "omit", cache: "no-store", redirect: "error", referrerPolicy: "no-referrer", signal: controller.signal });
        const location = await read(response, controller.signal); const keys = Object.keys(location);
        if (keys.length !== 2 || !keys.includes("countryCode") || !keys.includes("callingCode") || !/^[A-Z]{2}$/.test(location.countryCode) || !/^\\+[1-9][0-9]{0,2}$/.test(location.callingCode)) return null;
        return { countryCode: location.countryCode, callingCode: location.callingCode };
      } catch { return null; } finally { clearTimeout(timeout); signal?.removeEventListener("abort", abort); }
    }
  `
  assert.deepEqual(validateCustomerLocation(safeCustomerLocation), [])
  assert.ok(validateCustomerLocation(safeCustomerLocation.replace('method: "GET"', 'method: "POST"')).length > 0)
  assert.ok(validateCustomerLocation(`${safeCustomerLocation}\nnavigator.geolocation.getCurrentPosition(() => {});`).length > 0)

  const safeAdapter = `
    import { type PaymentCustomer, normalizePaymentCustomer } from "./payment-customer.ts";
    export const LEEKPAY_API_BASE = "${proxyOrigin}";
    export const LEEKPAY_CHECKOUT_CURRENCY = "XOF";
    async function requestPaymentApi(path, body, signal) {
      return fetch(LEEKPAY_API_BASE + path, { method: "POST", credentials: "omit", cache: "no-store", redirect: "error", body: JSON.stringify(body) });
    }
    export async function createLeekPayCheckout(productId: string, customer: PaymentCustomer, signal?: AbortSignal) {
      const normalizedCustomer = normalizePaymentCustomer(customer);
      return requestPaymentApi("/api/checkout", { productId, customer: { email: normalizedCustomer.email, whatsapp: normalizedCustomer.whatsapp } }, signal);
    }
    export async function getLeekPayOrderStatus(orderToken, signal) {
      const data = await requestPaymentApi("/api/orders/status", { orderToken }, signal);
      if (data.verified !== (data.status === "paid") || data.currency !== LEEKPAY_CHECKOUT_CURRENCY) throw Error();
    }
    export function readOrderToken(fragment) { return /^#order=([a-f0-9]{64})$/.exec(fragment)?.[1] ?? null; }
  `
  assert.deepEqual(validateFrontendAdapter(safeAdapter), [])
  assert.ok(validateFrontendAdapter(safeAdapter.replace('whatsapp: normalizedCustomer.whatsapp', 'whatsapp: normalizedCustomer.whatsapp, amount: 1')).length > 0)

  const safeProviderDialog = `
    import type { PaymentCustomer } from "@/lib/payment-customer";
    import { createLeekPayCheckout } from "@/lib/leekpay";
    interface PaymentProvidersProps { card: PaymentCardSelection; customer: PaymentCustomer; onBack: () => void; }
    export function PaymentProviders({ card, customer, onBack }: PaymentProvidersProps) {
      useEffect(() => {
        window.addEventListener("pageshow", handlePageShow);
        return () => {
          window.removeEventListener("pageshow", handlePageShow);
          requestRef.current?.abort();
        };
      }, []);
    }
    async function handleCheckout(card, controller) {
      const checkout = await createLeekPayCheckout(card.id, customer, controller.signal);
      window.location.assign(checkout.checkoutUrl);
    }
    const provider = <><fieldset><span>LeekPay</span></fieldset><Button disabled={isProcessing} onClick={onBack} type="button">Back</Button><Button disabled={isProcessing} onClick={handleCheckout} type="button">Pay</Button></>;
  `
  assert.deepEqual(validateProviderDialog(safeProviderDialog), [])
  assert.ok(validateProviderDialog(safeProviderDialog.replace('>LeekPay<', '>Provider<')).length > 0)
  assert.ok(validateProviderDialog(`${safeProviderDialog}\n<DialogPrimitive.Root />`).length > 0)

  const safeCheckoutDialog = `
    import { CustomerDetails } from "@/components/ui/dialog-customer";
    import { UsageNotes } from "@/components/ui/dialog-notes";
    import { PaymentProviders } from "@/components/ui/dialog-providers";
    import { detectCustomerLocation } from "@/lib/customer-location";
    interface DialogCheckoutProps { card: PaymentCardSelection; onClose: () => void; }
    type CheckoutStep = "notes" | "customer" | "providers";
    function CheckoutPanel({ children, reducedMotion }) {
      const isPresent = useIsPresent();
      const panelRef = useRef<HTMLDivElement>(null);
      useLayoutEffect(() => { if (panelRef.current) panelRef.current.inert = !isPresent; }, [isPresent]);
      return <motion.div aria-hidden={!isPresent || undefined} ref={panelRef}>{children}</motion.div>;
    }
    export function DialogCheckout({ card, onClose }: DialogCheckoutProps) {
      const [step, setStep] = useState<CheckoutStep>("notes");
      const [customer, setCustomer] = useState<PaymentCustomer>({ email: "", whatsapp: "" });
      const [locationRequested, setLocationRequested] = useState(false);
      const whatsappEditedRef = useRef(false);
      const validCustomer = normalizePaymentCustomer(customer);
      const reducedMotion = useReducedMotion() === true;
      useEffect(() => { titleRef.current?.focus(); }, [step]);
      useEffect(() => {
        if (!locationRequested) return;
        const controller = new AbortController();
        void detectCustomerLocation(controller.signal).then((location) => {
          if (!location || controller.signal.aborted) return;
          setCustomer((current) => whatsappEditedRef.current || current.whatsapp ? current : { ...current, whatsapp: location.callingCode });
        });
        return () => controller.abort();
      }, [locationRequested]);
      return <DialogPrimitive.Root open onOpenChange={(open) => { if (!open) onClose(); }}>
        <DialogPrimitive.Portal><DialogPrimitive.Overlay /><DialogPrimitive.Content asChild><motion.div layout={reducedMotion ? false : "size"}>
          <DialogPrimitive.Description>Description</DialogPrimitive.Description>
          <AnimatePresence initial={false} mode="wait"><CheckoutPanel key={step} reducedMotion={reducedMotion}>
          {step === "notes" ? <UsageNotes onAccept={() => { setStep("customer"); setLocationRequested(true); }} onClose={onClose} /> : step === "customer" ?
            <CustomerDetails value={customer} onChange={(details) => { if (details.whatsapp !== customer.whatsapp) whatsappEditedRef.current = true; setCustomer(details); }} onNext={(details) => { setCustomer(details); setStep("providers"); }} onBack={() => setStep("notes")} /> : validCustomer ?
            <PaymentProviders card={card} customer={validCustomer} onBack={() => setStep("customer")} /> : null}
          </CheckoutPanel></AnimatePresence>
        </motion.div></DialogPrimitive.Content></DialogPrimitive.Portal>
      </DialogPrimitive.Root>;
    }
  `
  assert.deepEqual(validateCheckoutDialog(safeCheckoutDialog), [])
  assert.ok(validateCheckoutDialog(safeCheckoutDialog.replace('useState<CheckoutStep>("notes")', 'useState<CheckoutStep>("providers")')).length > 0)
  assert.ok(validateCheckoutDialog(safeCheckoutDialog.replace('<DialogPrimitive.Overlay />', '<DialogPrimitive.Overlay /><DialogPrimitive.Overlay />')).length > 0)
  assert.ok(validateCheckoutDialog(safeCheckoutDialog.replace('setLocationRequested(true)', 'createLeekPayCheckout()')).length > 0)
  assert.ok(validateCheckoutDialog(safeCheckoutDialog.replace('whatsappEditedRef.current || current.whatsapp', 'false')).length > 0)

  const animatedCloseLifecycle = `
    const [isOpen, setIsOpen] = useState(true);
    const closeRequestedRef = useRef(false);
    const closeFinishedRef = useRef(false);
    const onClosedRef = useRef(onClosed);
    onClosedRef.current = onClosed;
    const finishClose = useCallback(() => {
      if (!closeRequestedRef.current || closeFinishedRef.current) return;
      closeFinishedRef.current = true;
      onClosedRef.current();
    }, []);
    const onClose = useCallback(() => {
      if (closeRequestedRef.current) return;
      closeRequestedRef.current = true;
      setIsOpen(false);
      if (reducedMotion) finishClose();
    }, [finishClose, reducedMotion]);
    useEffect(() => {
      if (isOpen) return;
      const timeout = window.setTimeout(finishClose, reducedMotion ? 0 : 260);
      return () => window.clearTimeout(timeout);
    }, [finishClose, isOpen, reducedMotion]);
    useLayoutEffect(() => { if (dialogElement) dialogElement.inert = !isOpen; }, [dialogElement, isOpen]);
  `
  const safeAnimatedCheckoutDialog = safeCheckoutDialog
    .replace('{ card, onClose }: DialogCheckoutProps', '{ card, onClose: onClosed, }: DialogCheckoutProps')
    .replace('const reducedMotion = useReducedMotion() === true;', `const reducedMotion = useReducedMotion() === true;\n${animatedCloseLifecycle}`)
    .replace('<DialogPrimitive.Root open ', '<DialogPrimitive.Root open={isOpen} ')
    .replace('<motion.div layout=', '<motion.div onAnimationEnd={(event) => { if (event.target === event.currentTarget && !isOpen && event.animationName === "checkout-mobile-exit") finishClose(); }} layout=')
    .replace('mode="wait"><CheckoutPanel', 'mode="wait">{isOpen && (<CheckoutPanel')
    .replace('</CheckoutPanel></AnimatePresence>', '</CheckoutPanel>)}</AnimatePresence>')
  assert.deepEqual(validateCheckoutDialog(safeCheckoutDialog.replace('{ card, onClose }', '{ onClose, card, }')), [])
  assert.deepEqual(validateCheckoutDialog(safeAnimatedCheckoutDialog), [])
  assert.deepEqual(validateCheckoutDialog(safeAnimatedCheckoutDialog
    .replace('{ card, onClose: onClosed, }', '{ onClose: afterClose, card }')
    .replace(/\bonClosed\b/g, 'afterClose')), [])
  for (const [before, after] of [
    ['useState(true)', 'useState(false)'],
    ['open={isOpen}', 'open={false}'],
    ['{isOpen && (<CheckoutPanel', '{true && (<CheckoutPanel'],
    ['dialogElement.inert = !isOpen', 'dialogElement.inert = false'],
    ['panelRef.current.inert = !isPresent', 'panelRef.current.inert = false'],
    ['if (closeRequestedRef.current) return;', ''],
    ['if (!closeRequestedRef.current || closeFinishedRef.current) return;', ''],
    ['if (reducedMotion) finishClose();', ''],
    ['reducedMotion ? 0 : 260', 'reducedMotion ? 0 : 10000'],
    ['window.clearTimeout(timeout)', 'void timeout'],
    ['event.currentTarget && !isOpen', 'event.currentTarget && isOpen'],
    ['<DialogPrimitive.Overlay />', '<DialogPrimitive.Overlay /><DialogPrimitive.Root />'],
    ['onClose: onClosed, }', 'onClose: onClosed, isOpen }'],
  ]) {
    assert.ok(safeAnimatedCheckoutDialog.includes(before), `Animated fixture mutation must match: ${before}`)
    assert.ok(validateCheckoutDialog(safeAnimatedCheckoutDialog.replace(before, after)).length > 0, `Animated checkout must reject: ${before} -> ${after}`)
  }
  for (const legacyLifecycle of ['onExitComplete', 'notes-exiting', 'checkoutStep', 'DialogNotes', 'DialogProviders']) {
    assert.ok(validateCheckoutDialog(`${safeAnimatedCheckoutDialog}\nconst legacy = "${legacyLifecycle}";`).length > 0)
  }

  const safeWorkerLocation = `
    import { getCountryCallingCode, isSupportedCountry } from "libphonenumber-js";
    function locationResponse(request: Request, origin: string): Response {
      const country: unknown = request.cf?.country;
      if (typeof country !== "string" || !/^[A-Z]{2}$/.test(country) || !isSupportedCountry(country)) return jsonResponse({ countryCode: null, callingCode: null }, 200, origin);
      return jsonResponse({ countryCode: country, callingCode: \`+\${getCountryCallingCode(country)}\` }, 200, origin);
    }

    async function next() {}
    async function route(request, env) {
      if (url.pathname === "/api/location") {
        if (url.search) throw new ApiError(404, "not_found");
        if (!origin) throw new ApiError(403, "origin_forbidden");
        if (request.method === "OPTIONS" && request.headers.get("Access-Control-Request-Method") !== "GET") throw Error();
        if (request.method !== "GET") throw new ApiError(405, "method_not_allowed");
        await enforceRateLimit(request, env, false);
        return locationResponse(request, origin);
      }
      const create = false;
    }
  `
  assert.deepEqual(validateWorkerLocation(safeWorkerLocation), [])
  assert.ok(validateWorkerLocation(safeWorkerLocation.replace('request.cf?.country', 'request.headers.get("CF-IPCountry")')).length > 0)
  assert.deepEqual(validateWorkerPackage('{"dependencies":{"libphonenumber-js":"1.13.12"}}'), [])
  assert.ok(validateWorkerPackage('{"dependencies":{"libphonenumber-js":"^1.13.12"}}').length > 0)

  const safeWorkerCustomer = `
    customer_email: customer.email,
    customer_phone: customer.whatsapp,
    customer_name: \`Client (\${customer.email})\`,
  `
  assert.deepEqual(validateWorkerCustomerForwarding(safeWorkerCustomer), [])
  assert.ok(validateWorkerCustomerForwarding(safeWorkerCustomer.replace('Client (\${customer.email})', '\${customer.email}')).length > 0)
  assert.ok(validateWorkerCustomerForwarding(`${safeWorkerCustomer}\nconst suppliedName = payload.customer.name;`).length > 0)

  const safeCatalogue = `
    import { DialogCheckout } from "@/components/ui/dialog-checkout";
    const selectedCard = card;
    const view = selectedCard && (<DialogCheckout card={selectedCard} onClose={() => setSelectedCard(null)} />);
  `
  assert.deepEqual(validateCatalogueFlow(safeCatalogue), [])
  assert.ok(validateCatalogueFlow(`${safeCatalogue}\nconst [checkoutStep, setCheckoutStep] = useState("notes");`).length > 0)

  const safeResult = `
    const orderToken = readOrderToken(window.location.hash);
    const result = await getLeekPayOrderStatus(orderToken);
    if (result.status === "paid" && result.verified === true) finish("paid");
    pollTimer = setTimeout(poll, delay); delay = Math.min(delay * 2, 10000);
    const isPaid = verification === "paid" && order?.verified === true;
    if ((isPaid && order) || isSimulation) {
      return (<PaymentReceipt amount={isPaid && order ? order.amount : 5000} createdAt={isPaid && order ? order.createdAt : Date.UTC(2026, 8, 5, 12)} />);
    }
  `
  const safeReceipt = "Une fois votre compte créé et vérifié, envoyez-nous l’adresse e-mail associée par Telegram en priorité, ou par WhatsApp. Nous procéderons alors à l’ajout de la carte dans votre compte."
  assert.deepEqual(validatePaymentResult(safeResult, safeReceipt), [])
  assert.ok(validatePaymentResult(safeResult.replace('result.verified === true', 'true'), safeReceipt).length > 0)
  assert.ok(validatePaymentResult(`${safeResult}\nconst query = new URLSearchParams(window.location.search);`, safeReceipt).length > 0)
  assert.ok(validatePaymentResult(safeResult.replace('isPaid && order', 'true'), safeReceipt).length > 0)
  assert.ok(validatePaymentResult(safeResult.replace('order.createdAt', 'Date.now()'), safeReceipt).length > 0)
  assert.ok(validatePaymentResult(safeResult, 'Votre carte a déjà été ajoutée automatiquement.').length > 0)
  console.log('Security scanner self-test passed.')
}

if (runSelfTest) {
  selfTest()
  process.exit(0)
}

const failures = []
if (configuredBasePath && configuredBasePath !== '/' && !validBasePathPattern.test(configuredBasePath)) {
  failures.push('NEXT_PUBLIC_BASE_PATH is not a safe absolute URL path')
}

for (const requiredPath of requiredPaths) {
  if (!(await pathExists(requiredPath))) failures.push(`Required architecture file is missing: ${requiredPath}`)
}
for (const forbiddenPath of forbiddenPaths) {
  if (await pathExists(forbiddenPath)) failures.push(`Insecure legacy path restored: ${forbiddenPath}`)
}

const frontendFiles = [
  ...await listFiles(path.join(projectRoot, 'src'), appExtensions),
  ...await listFiles(path.join(projectRoot, 'public'), appExtensions),
]
for (const file of frontendFiles) {
  const source = await readFile(file, 'utf8')
  const relativePath = normalizedRelativePath(file)
  for (const rule of forbiddenFrontendPatterns) {
    if (rule.pattern.test(source)) failures.push(`${rule.label}: ${relativePath}`)
  }
  failures.push(...validateFrontendUrls(source, relativePath))
  if (/^src\/(?:app|components)\//.test(relativePath) && /\bfetch\s*\(/.test(source)) {
    failures.push(`Direct fetch is forbidden in UI code: ${relativePath}`)
  }
  failures.push(...validateDataCollectionControls(source, relativePath))
}

const routeSources = frontendFiles
  .map(normalizedRelativePath)
  .filter((relativePath) => /^src\/app\/(?:.+\/)?(?:page|route)\.(?:js|jsx|ts|tsx)$/.test(relativePath))
for (const expectedRoute of allowedRouteSources) {
  if (!routeSources.includes(expectedRoute)) failures.push(`Required application route is missing: ${expectedRoute}`)
}
for (const routeSource of routeSources) {
  if (!allowedRouteSources.has(routeSource)) failures.push(`Unexpected application route: ${routeSource}`)
}

const repositoryFiles = await listFiles(projectRoot, null, ignoredDirectories)
let repositoryFileCount = 0
const environmentCredentials = []
for (const file of repositoryFiles) {
  const relativePath = normalizedRelativePath(file)
  if (relativePath === 'scripts/security-check.mjs' || isIgnoredGeneratedFile(relativePath)) continue
  const contents = await readFile(file)
  if (isProbablyBinary(contents)) continue
  repositoryFileCount += 1
  const source = contents.toString('utf8')
  if (isEnvironmentFile(file)) {
    for (const credential of findEnvironmentCredentials(source)) {
      failures.push(`Concrete credential in environment file: ${relativePath}:${credential.line} (${credential.key})`)
      environmentCredentials.push({ ...credential, relativePath })
    }
  }
  if (containsRetiredCredential(source)) failures.push(`Retired credential restored: ${relativePath}`)
  for (const rule of highConfidenceSecretPatterns) {
    if (rule.pattern.test(source)) failures.push(`${rule.label}: ${relativePath}`)
  }
}

if (requireOutput) {
  for (const credential of findPublicProcessEnvironmentCredentials(process.env)) {
    failures.push(`Browser-exposed credential in process environment (${credential.key})`)
    environmentCredentials.push({ ...credential, relativePath: 'process environment', line: 0 })
  }
}

async function readRequired(relativePath) {
  return await pathExists(relativePath) ? readFile(path.join(projectRoot, relativePath), 'utf8') : ''
}

const notesSource = await readRequired(usageNotesDialogPath)
if (notesSource) {
  failures.push(...validateUsageNotesButtons(notesSource, usageNotesDialogPath))
  failures.push(...validateUsageNotesStructure(notesSource))
}
const paymentCustomerSource = await readRequired(paymentCustomerPath)
if (paymentCustomerSource) failures.push(...validatePaymentCustomer(paymentCustomerSource))
const customerLocationSource = await readRequired(customerLocationPath)
if (customerLocationSource) failures.push(...validateCustomerLocation(customerLocationSource))
const customerDialogSource = await readRequired(customerDialogPath)
if (customerDialogSource) failures.push(...validateCustomerDialog(customerDialogSource))
const adapterSource = await readRequired(frontendAdapterPath)
if (adapterSource) failures.push(...validateFrontendAdapter(adapterSource))
const providerDialogSource = await readRequired(providerDialogPath)
if (providerDialogSource) failures.push(...validateProviderDialog(providerDialogSource))
const checkoutDialogSource = await readRequired(checkoutDialogPath)
if (checkoutDialogSource) failures.push(...validateCheckoutDialog(checkoutDialogSource))
const catalogueSource = await readRequired('src/app/page.tsx')
if (catalogueSource) failures.push(...validateCatalogueFlow(catalogueSource))
const paymentResultSource = await readRequired(paymentResultPath)
if (paymentResultSource) failures.push(...validatePaymentResult(paymentResultSource, await readRequired(paymentReceiptPath) ?? ''))
const workerSource = await readRequired(workerSourcePath)
if (workerSource) failures.push(...validateWorkerSource(workerSource))
const workerConfig = await readRequired(workerConfigPath)
if (workerConfig) failures.push(...validateWorkerConfig(workerConfig))
const workerPackage = await readRequired('worker/package.json')
if (workerPackage) failures.push(...validateWorkerPackage(workerPackage))

const layoutSource = await readRequired('src/app/layout.tsx')
if (layoutSource) {
  const requiredCspDirectives = [
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    `connect-src 'self' ${proxyOrigin}`,
    "form-action 'none'",
    "frame-src 'none'",
  ]
  for (const directive of requiredCspDirectives) {
    if (!layoutSource.includes(`"${directive}"`)) failures.push(`Required CSP directive is missing or broadened: ${directive}`)
  }
  if (/leekpay\.(?:fr|me)|https:\/\/\*|connect-src[^"\n]*\*/i.test(layoutSource)) failures.push('Frontend CSP trusts an unapproved provider/wildcard origin')
}

for (const [routePath, expectedStatus] of [
  ['src/app/payment-success/page.tsx', 'success'],
  ['src/app/payment-failure/page.tsx', 'failure'],
]) {
  const source = await readRequired(routePath)
  if (!source) continue
  if (!new RegExp(`status=["']${expectedStatus}["']`).test(source)) failures.push(`Technical route has wrong result status: ${routePath}`)
  if (!/index\s*:\s*false/.test(source)) failures.push(`Technical payment route must be noindex: ${routePath}`)
}

let outputFileCount = 0
if (requireOutput) {
  const outputRoot = path.join(projectRoot, 'out')
  if (!(await pathExists('out'))) {
    failures.push('Production output is missing; run npm run build first')
  } else {
    const outputFiles = await listFiles(outputRoot, null)
    let outputHasProxy = false
    for (const file of outputFiles) {
      const contents = await readFile(file)
      if (isProbablyBinary(contents)) continue
      outputFileCount += 1
      const source = contents.toString('utf8')
      const relativePath = normalizedRelativePath(file)
      if (source.includes(proxyOrigin)) outputHasProxy = true
      if (containsRetiredCredential(source)) failures.push(`Retired credential in production output: ${relativePath}`)
      for (const rule of highConfidenceSecretPatterns) {
        if (rule.pattern.test(source)) failures.push(`${rule.label} in production output: ${relativePath}`)
      }
      for (const rule of forbiddenOutputPatterns) {
        if (rule.pattern.test(source)) failures.push(`${rule.label}: ${relativePath}`)
      }
      failures.push(...validateFrontendUrls(source, relativePath, true))
      for (const credential of environmentCredentials) {
        if (source.includes(credential.value)) failures.push(`Environment credential embedded in output: ${relativePath} (from ${credential.relativePath})`)
      }
      if (path.extname(file) === '.map') failures.push(`Source map published: ${relativePath}`)
      if (path.extname(file) === '.html' && expectedBasePath) {
        for (const match of source.matchAll(/\b(?:href|src)=["'](\/[^"'?#]*)/g)) {
          const target = match[1]
          if (target !== expectedBasePath && !target.startsWith(`${expectedBasePath}/`)) {
            failures.push(`Asset or link escapes GitHub Pages base path: ${relativePath} (${target})`)
            break
          }
        }
      }
    }
    if (!outputHasProxy) failures.push('Payment proxy origin is missing from production output')

    const manifestPath = path.join(outputRoot, 'manifest.json')
    if (!(await pathExists('out/manifest.json'))) {
      failures.push('Production manifest is missing')
    } else {
      const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
      const icons = Array.isArray(manifest.icons) ? manifest.icons : []
      const paths = [manifest.id, manifest.start_url, manifest.scope, ...icons.map((icon) => icon.src)]
      if (icons.length === 0 || paths.some((value) => typeof value !== 'string' || value.startsWith('/'))) {
        failures.push('Web app manifest paths must remain relative')
      }
    }

    if (!(await pathExists('out/index.html'))) {
      failures.push('Production root page is missing')
    } else {
      const rootHtml = await readFile(path.join(outputRoot, 'index.html'), 'utf8')
      if (!rootHtml.includes('http-equiv="Content-Security-Policy"')) failures.push('CSP meta tag missing from production output')
      const encodedCspDirectives = [
        "script-src &#x27;self&#x27; &#x27;unsafe-inline&#x27;;",
        `connect-src &#x27;self&#x27; ${proxyOrigin};`,
        "form-action &#x27;none&#x27;;",
        "frame-src &#x27;none&#x27;;",
      ]
      for (const directive of encodedCspDirectives) {
        if (!rootHtml.includes(directive)) failures.push(`Production CSP directive is missing or broadened: ${directive}`)
      }
      if (!rootHtml.includes(`${expectedBasePath}/register-sw.js`)) failures.push('Service-worker registration escapes the Pages base path')
      if (!rootHtml.includes('Cartes virtuelles DRAVA')) failures.push('Card catalogue is missing from production root')
      if (process.env.NEXT_PUBLIC_SITE_URL) {
        const siteUrl = new URL(process.env.NEXT_PUBLIC_SITE_URL)
        siteUrl.pathname = `${siteUrl.pathname.replace(/\/$/, '')}/`
        if (!rootHtml.includes(new URL('og-image.svg', siteUrl).href)) failures.push('Social preview URL does not match Pages configuration')
      }
    }

    for (const route of forbiddenPageRoutes) {
      const candidates = [`out/${route}.html`, `out/${route}/index.html`]
      if ((await Promise.all(candidates.map(pathExists))).some(Boolean)) failures.push(`Removed route is present in output: /${route}`)
    }
    for (const route of ['payment-success', 'payment-failure']) {
      const candidates = [`out/${route}.html`, `out/${route}/index.html`]
      if (!(await Promise.all(candidates.map(pathExists))).some(Boolean)) failures.push(`Required technical route is missing from output: /${route}`)
    }

    const allowedHtmlPaths = new Set([
      '404.html',
      '404/index.html',
      'index.html',
      'payment-success.html',
      'payment-success/index.html',
      'payment-failure.html',
      'payment-failure/index.html',
    ])
    for (const file of outputFiles) {
      if (path.extname(file) !== '.html') continue
      const relativePath = path.relative(outputRoot, file).split(path.sep).join('/')
      if (!allowedHtmlPaths.has(relativePath)) failures.push(`Unexpected HTML route in output: ${relativePath}`)
    }
  }
}

if (failures.length > 0) {
  console.error('Security safeguards failed:')
  for (const failure of [...new Set(failures)]) console.error(`- ${failure}`)
  process.exit(1)
}

const outputSummary = requireOutput ? `; ${outputFileCount} production files scanned` : ''
console.log(`Security safeguards passed (${repositoryFileCount} repository files scanned${outputSummary}).`)
