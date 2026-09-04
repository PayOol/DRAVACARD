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

const leekPaySdkUrl = 'https://leekpay.fr/js/leekpay.js'
const leekPayOrigin = 'https://leekpay.fr'
const allowedLeekPayPublicKey = 'pk_live_L1EjmvxLXb4Djtyk0bN78dmQVIPPBYfh'
const leekPayAdapterPath = 'src/lib/leekpay.ts'
const providerDialogPath = 'src/components/ui/dialog-providers.tsx'
const usageNotesDialogPath = 'src/components/ui/dialog-notes.tsx'
const allowedRouteSources = new Set([
  'src/app/page.tsx',
  'src/app/payment-success/page.tsx',
  'src/app/payment-failure/page.tsx',
])

const paymentCredentialPattern = /\b(?:pk|sk)_(?:live|test)_[A-Za-z0-9_-]{12,}\b/g
const leekPaySecretPattern = /\bsk_(?:live|test)_[A-Za-z0-9_-]+\b/i
const externalLeekPayUrlPattern = /https?:\/\/[^\s"'`<>),;]*/gi

const retiredCredentialHashes = new Set([
  // SHA-256 only: retaining the revoked plaintext here would recreate the leak.
  '5755520164cac3c3fd5957bd48249ea21b88a4b9f36f924b54cb3847ecbc8be1',
])

const forbiddenAppPatterns = [
  {
    label: 'Soleas credential in client source',
    pattern: /\b(?:SOLEAS_API_KEY|NEXT_PUBLIC_SOLEAS[A-Z0-9_]*)\b/i,
  },
  { label: 'LeekPay secret key in client source', pattern: leekPaySecretPattern },
  { label: 'Legacy XAF currency label in client source', pattern: /\bXAF\b/ },
  { label: 'FormSubmit relay', pattern: /formsubmit\.co/i },
  {
    label: 'WhatsApp personal-data handoff',
    pattern: /wa\.me(?:\/|\?)|(?:api|web)\.whatsapp\.com\/send|whatsapp:\/\/send/i,
  },
  { label: 'HTML injection sink', pattern: /dangerouslySetInnerHTML|\.innerHTML\s*=/ },
  { label: 'Payment checkout embedded in an iframe', pattern: /<iframe\b|document\.createElement\(\s*["']iframe["']\s*\)/i },
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
    label: 'non-LeekPay payment provider integration',
    pattern: /\b(?:Stripe|PayPal|PaystackPop|FlutterwaveCheckout|SoleasPay)\s*\.|(?:js\.stripe\.com|paypal\.com\/sdk|js\.paystack\.co|checkout\.flutterwave\.com)/i,
  },
  {
    label: 'retired transaction marketing claim',
    pattern: /Paiements sans frontières|Your modern payment solution/i,
  },
  {
    label: 'financial or personal data in localStorage',
    pattern: /localStorage\.(?:getItem|setItem)\(\s*["'][^"']*(?:card|cvv|email|otp|pan|withdraw|code)/i,
  },
  {
    label: 'automatic card fulfillment from browser payment state',
    pattern: /\b(?:autoFulfill|fulfillOrder|issueCard|issueVirtualCard|provisionCard|deliverCard|revealCard|generateCard|activateCard)\s*\(/i,
  },
]

const highConfidenceSecretPatterns = [
  { label: 'private key', pattern: /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----/ },
  { label: 'LeekPay secret key', pattern: leekPaySecretPattern },
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
  { label: 'LeekPay secret key in production output', pattern: leekPaySecretPattern },
  { label: 'Legacy XAF currency label in production output', pattern: /\bXAF\b/ },
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
  {
    label: 'automatic card fulfillment in production output',
    pattern: /\b(?:autoFulfill|fulfillOrder|issueCard|issueVirtualCard|provisionCard|deliverCard|revealCard|generateCard|activateCard)\b/i,
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
  usageNotesDialogPath,
  providerDialogPath,
  leekPayAdapterPath,
]

const optionalCardSurfacePaths = [
  'src/components/ui/tabs.tsx',
  'src/types/leekpay.d.ts',
]

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
    label: 'Card purchase surface contains direct payment navigation',
    pattern: /\b(?:window\.open|createPaymentGateway|submitPaymentForm|openPaymentModal)\s*\(/i,
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

function redactAllowedLeekPayPublicKey(source) {
  return source.split(allowedLeekPayPublicKey).join('[allowed-leekpay-public-key]')
}

function validatePaymentCredentials(source, relativePath, allowBundledPublicKey = false) {
  const credentialFailures = []
  const matches = source.match(paymentCredentialPattern) ?? []

  for (const credential of matches) {
    if (/^sk_(?:live|test)_/i.test(credential)) {
      credentialFailures.push(`LeekPay secret key exposed: ${relativePath}`)
      continue
    }
    if (credential !== allowedLeekPayPublicKey) {
      credentialFailures.push(`Unapproved payment public key: ${relativePath}`)
      continue
    }
    if (!allowBundledPublicKey && relativePath !== leekPayAdapterPath) {
      credentialFailures.push(`LeekPay public key must be isolated in ${leekPayAdapterPath}: ${relativePath}`)
    }
  }

  return credentialFailures
}

function validateLeekPayUrls(source, relativePath, allowProductionBundle = false) {
  const urlFailures = []
  const matches = source.match(externalLeekPayUrlPattern) ?? []

  for (const url of matches) {
    if (!/leekpay/i.test(url)) continue
    if (url === leekPayOrigin) continue
    if (url === leekPaySdkUrl
      && (allowProductionBundle || relativePath === leekPayAdapterPath)) continue
    urlFailures.push(`Unapproved LeekPay URL (${url}): ${relativePath}`)
  }

  return urlFailures
}

function validateNoDirectSdkUse(source, relativePath) {
  if (relativePath === leekPayAdapterPath || relativePath === 'src/types/leekpay.d.ts') return []
  const failures = []
  if (/\b(?:window\.)?LeekPay\s*\.\s*(?:checkout|configure|redirect|close)\s*\(/.test(source)) {
    failures.push(`LeekPay SDK must only be called through ${leekPayAdapterPath}: ${relativePath}`)
  }
  if (/\bapiKey\s*:/.test(source)) {
    failures.push(`LeekPay apiKey must only be passed inside ${leekPayAdapterPath}: ${relativePath}`)
  }
  return failures
}

function validateNoUiFetch(source, relativePath) {
  if (!/^src\/(?:app|components)\//.test(relativePath)) return []
  return /\bfetch\s*\(/.test(source)
    ? [`Direct fetch is forbidden in UI code: ${relativePath}`]
    : []
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
  assert.equal(matchingRules(
    redactAllowedLeekPayPublicKey(`const config={apiKey:"${allowedLeekPayPublicKey}"}`),
    highConfidenceSecretPatterns,
  ).length, 0)
  assert.ok(publicEnvironmentCredentialPattern.test('process.env.NEXT_PUBLIC_PAYMENT_TOKEN'))
  assert.equal(findEnvironmentCredentials('API_KEY=placeholder\nTOKEN=${TOKEN}').length, 0)
  assert.deepEqual(validatePaymentCredentials(
    `export const key = '${allowedLeekPayPublicKey}'`,
    leekPayAdapterPath,
  ), [])
  assert.ok(validatePaymentCredentials(
    "const key = 'sk_live_this_must_never_be_bundled'",
    leekPayAdapterPath,
  ).some((failure) => failure.includes('secret key exposed')))
  assert.ok(validatePaymentCredentials(
    "const key = 'pk_test_unapproved_public_key_123456'",
    leekPayAdapterPath,
  ).some((failure) => failure.includes('Unapproved payment public key')))
  assert.ok(validatePaymentCredentials(
    `const key = '${allowedLeekPayPublicKey}'`,
    'src/app/page.tsx',
  ).some((failure) => failure.includes('must be isolated')))
  assert.deepEqual(validateLeekPayUrls(
    `const sdk = '${leekPaySdkUrl}'`,
    leekPayAdapterPath,
  ), [])
  assert.ok(validateLeekPayUrls(
    "const endpoint = 'https://leekpay.fr/api/public/widget/checkout'",
    leekPayAdapterPath,
  ).some((failure) => failure.includes('Unapproved LeekPay URL')))
  assert.ok(validateLeekPayUrls(
    "const sdk = 'https://leekpay.fr.evil.example/js/leekpay.js'",
    leekPayAdapterPath,
  ).some((failure) => failure.includes('Unapproved LeekPay URL')))
  assert.ok(validateNoDirectSdkUse(
    'window.LeekPay.checkout(options)',
    'src/components/ui/dialog-providers.tsx',
  ).some((failure) => failure.includes('must only be called through')))
  assert.ok(validateNoUiFetch(
    "fetch('https://leekpay.fr/api/public/widget/checkout')",
    'src/components/ui/dialog-providers.tsx',
  ).some((failure) => failure.includes('Direct fetch')))

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

  assert.ok(matchingRules('const SOLEAS_API_KEY = process.env.VALUE', forbiddenAppPatterns)
    .some((rule) => rule.label === 'Soleas credential in client source'))
  assert.ok(matchingRules('const endpoint = "https://checkout.soleaspay.com"', forbiddenAppPatterns)
    .some((rule) => rule.label === 'legacy browser-side Soleas checkout endpoint'))
  assert.ok(matchingRules('localStorage.setItem("userEmail", email)', forbiddenCardSurfacePatterns)
    .some((rule) => rule.label === 'Card purchase surface uses localStorage'))
  assert.ok(matchingRules('<form action="https://checkout.soleaspay.com">', forbiddenCardSurfacePatterns)
    .some((rule) => rule.label === 'Card purchase surface restores a browser-side payment form'))
  assert.ok(matchingRules('<input type="email" />', forbiddenCardSurfacePatterns)
    .some((rule) => rule.label === 'Card purchase surface contains a personal-data input'))
  assert.ok(matchingRules("window.open('https://unreviewed-provider.example')", forbiddenCardSurfacePatterns)
    .some((rule) => rule.label === 'Card purchase surface contains direct payment navigation'))

  const safeUsageNotesButtons = `
    export function PaymentDialog({ onAccept }) {
      const handleAccept = () => onAccept()
      return <div><Button onClick={handleAccept}>Proceed</Button><Button disabled={true}>Direct</Button></div>
    }
  `
  assert.deepEqual(validateUsageNotesButtons(safeUsageNotesButtons, 'safe-dialog.tsx'), [])
  assert.ok(validateUsageNotesButtons(`
    export function PaymentDialog({ onAccept }) {
      return <div><Button disabled onClick={onAccept}>Proceed</Button><Button disabled>Direct</Button></div>
    }
  `, 'disabled-accept-dialog.tsx').some((failure) => failure.includes('must be active')))
  assert.ok(validateUsageNotesButtons(`
    export function PaymentDialog({ onAccept }) {
      return <div><Button onClick={onAccept}>Proceed</Button><Button onClick={pay}>Direct</Button></div>
    }
  `, 'enabled-direct-dialog.tsx').some((failure) => failure.includes('statically disabled')))
  assert.ok(validateUsageNotesButtons(`
    export function PaymentDialog({ onAccept }) {
      return <div><Link href="/pay"><Button onClick={onAccept}>Proceed</Button></Link><Button disabled>Direct</Button></div>
    }
  `, 'linked-dialog.tsx').some((failure) => failure.includes('must not be nested')))

  const safeAdapter = `
    const SDK_URL = '${leekPaySdkUrl}'
    const PUBLIC_KEY = '${allowedLeekPayPublicKey}'
    export function startLeekPay(amount) {
      window.LeekPay.checkout({
        amount,
        currency: 'XOF',
        apiKey: PUBLIC_KEY,
        description: 'DRAVA virtual card',
        returnUrl: 'https://drava.click/payment-success/',
        onSuccess: () => navigate('/payment-success'),
        onCancel: () => navigate('/payment-failure'),
        onError: () => navigate('/payment-failure'),
      })
    }
  `
  assert.deepEqual(validateLeekPayAdapter(safeAdapter), [])
  assert.ok(validateLeekPayAdapter(safeAdapter.replace(
    "        returnUrl: 'https://drava.click/payment-success/',\n",
    '',
  )).some((failure) => failure.includes('returnUrl')))
  assert.ok(validateLeekPayAdapter(safeAdapter.replace("currency: 'XOF'", "currency: 'XAF'"))
    .some((failure) => failure.includes('never send XAF')))
  assert.ok(validateLeekPayAdapter(safeAdapter.replace(
    'window.LeekPay.checkout({',
    "fetch('https://leekpay.fr/api/public/widget/checkout'); window.LeekPay.checkout({",
  )).some((failure) => failure.includes('must not call fetch')))

  const safeProviderDialog = `
    import { startLeekPay } from '@/lib/leekpay'
    export function DialogProviders() {
      const pay = () => startLeekPay({
        amount: 5000,
        returnUrl: new URL('/payment-success/', window.location.origin).href,
      })
      return <Button onClick={pay}>LeekPay — paiement en XOF</Button>
    }
  `
  assert.deepEqual(validateProviderDialog(safeProviderDialog), [])
  assert.ok(validateProviderDialog(`${safeProviderDialog}<input type="email" />`)
    .some((failure) => failure.includes('data-entry controls')))
  assert.ok(validateProviderDialog(safeProviderDialog.replace('XOF', 'XAF'))
    .some((failure) => failure.includes('charge currency XOF')))

  assert.deepEqual(validateCatalogueProviderFlow(`
    export function Catalogue() {
      const valid = data.amount === expectedAmount
        && data.currency === LEEKPAY_CHECKOUT_CURRENCY
        && data.status === 'paid'
        && Boolean(data.payment_id)
      const route = valid ? '/payment-success/' : '/payment-failure/'
      return <><DialogNotes onAccept={openProviders} /><DialogProviders route={route} /></>
    }
  `), [])
  assert.ok(validateCatalogueProviderFlow('<DialogNotes />')
    .some((failure) => failure.includes('both usage-notes and provider dialogs')))
  assert.ok(matchingRules('issueCard(transaction)', forbiddenAppPatterns)
    .some((rule) => rule.label === 'automatic card fulfillment from browser payment state'))
  assert.ok(matchingRules('currency: "XAF"', forbiddenAppPatterns)
    .some((rule) => rule.label === 'Legacy XAF currency label in client source'))
  assert.ok(matchingRules('10 000 XAF', forbiddenOutputPatterns)
    .some((rule) => rule.label === 'Legacy XAF currency label in production output'))

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

function validateUsageNotesButtons(source, fileName) {
  const sourceFile = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  if (sourceFile.parseDiagnostics.length > 0) {
    return [`Usage-notes dialog cannot be parsed as TSX: ${fileName}`]
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
    buttonFailures.push(`Usage-notes dialog must contain exactly two Button controls (found ${buttons.length})`)
  }

  for (const [index, { node, openingElement }] of buttons.entries()) {
    const label = index === 0 ? 'Usage-notes accept button' : 'Direct-payment button'
    const attributes = openingElement.attributes.properties
    if (attributes.some((attribute) => ts.isJsxSpreadAttribute(attribute))) {
      buttonFailures.push(`${label} must not use spread attributes`)
    }

    const jsxAttributes = attributes.filter(ts.isJsxAttribute)
    const disabledAttributes = jsxAttributes.filter((attribute) => attribute.name.getText() === 'disabled')
    const attributeNames = jsxAttributes.map((attribute) => attribute.name.getText())
    if (index === 0) {
      if (disabledAttributes.length > 0) buttonFailures.push(`${label} must be active`)
      if (attributeNames.filter((name) => name === 'onClick').length !== 1) {
        buttonFailures.push(`${label} must have exactly one onClick handler`)
      }
    } else if (disabledAttributes.length !== 1 || !isStaticallyDisabled(disabledAttributes[0])) {
      buttonFailures.push(`${label} must be statically disabled`)
    }

    const forbiddenAttributes = attributeNames.filter((name) =>
      (index === 0 ? /^on(?!Click$)/i.test(name) : /^on/i.test(name))
        || ['action', 'asChild', 'formAction', 'href', 'target'].includes(name))
    if (forbiddenAttributes.length > 0) {
      buttonFailures.push(`${label} has forbidden interactive attributes: ${forbiddenAttributes.join(', ')}`)
    }

    if (hasInteractiveDescendant(node) || hasInteractiveAncestor(node)) {
      buttonFailures.push(`${label} must not be nested in or contain an interactive wrapper`)
    }
  }

  const invokesOnAccept = /\bonAccept\s*\(/.test(source)
    || /onClick\s*=\s*{\s*onAccept\s*}/.test(source)
  if (!invokesOnAccept) {
    buttonFailures.push('Usage-notes accept button must invoke onAccept')
  }

  return buttonFailures
}

function getObjectProperty(objectLiteral, propertyName) {
  return objectLiteral.properties.find((property) =>
    (ts.isPropertyAssignment(property) || ts.isShorthandPropertyAssignment(property)
      || ts.isMethodDeclaration(property))
      && property.name?.getText().replace(/["']/g, '') === propertyName)
}

function validateLeekPayAdapter(source) {
  const adapterFailures = []
  const sourceFile = ts.createSourceFile(leekPayAdapterPath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
  if (sourceFile.parseDiagnostics.length > 0) {
    return [`LeekPay adapter cannot be parsed as TypeScript: ${leekPayAdapterPath}`]
  }

  if ((source.split(leekPaySdkUrl).length - 1) !== 1) {
    adapterFailures.push(`LeekPay adapter must declare the exact SDK URL once: ${leekPaySdkUrl}`)
  }
  if ((source.split(allowedLeekPayPublicKey).length - 1) !== 1) {
    adapterFailures.push('LeekPay adapter must contain exactly the approved pk_live public key')
  }
  if (/\bfetch\s*\(/.test(source)) {
    adapterFailures.push('LeekPay adapter must use the SDK and must not call fetch directly')
  }
  if (/\bXAF\b/.test(source)) {
    adapterFailures.push('LeekPay adapter must never send XAF to the provider')
  }
  if (/\b(?:customerEmail|customerName|customerPhone|customer_email|customer_name|customer_phone|cardNumber|card_number|cvv|pan)\b/i.test(source)) {
    adapterFailures.push('LeekPay adapter must not collect or transmit customer/card data')
  }
  if (/\b(?:paymentLink|LeekPay\s*\.\s*redirect)\b/.test(source)) {
    adapterFailures.push('LeekPay adapter must use the reviewed checkout flow only')
  }

  const checkoutCalls = []
  function visit(node) {
    if (ts.isCallExpression(node)
      && ts.isPropertyAccessExpression(node.expression)
      && node.expression.name.getText() === 'checkout'
      && /LeekPay/.test(node.expression.expression.getText())) {
      checkoutCalls.push(node)
    }
    ts.forEachChild(node, visit)
  }
  visit(sourceFile)

  if (checkoutCalls.length !== 1) {
    adapterFailures.push(`LeekPay adapter must contain exactly one LeekPay.checkout call (found ${checkoutCalls.length})`)
  } else {
    const options = checkoutCalls[0].arguments[0]
    if (!options || !ts.isObjectLiteralExpression(options)) {
      adapterFailures.push('LeekPay.checkout options must be an auditable object literal')
    } else {
      const currency = getObjectProperty(options, 'currency')
      const currencyIsStaticXof = currency && ts.isPropertyAssignment(currency)
        && ((ts.isStringLiteral(currency.initializer) && currency.initializer.text === 'XOF')
          || (ts.isIdentifier(currency.initializer)
            && currency.initializer.text === 'LEEKPAY_CHECKOUT_CURRENCY'
            && /LEEKPAY_CHECKOUT_CURRENCY\s*=\s*["']XOF["']/.test(source)))
      if (!currencyIsStaticXof) {
        adapterFailures.push('LeekPay.checkout currency must be the static string XOF')
      }
      for (const requiredOption of ['amount', 'apiKey', 'description', 'returnUrl', 'onSuccess', 'onCancel', 'onError']) {
        if (!getObjectProperty(options, requiredOption)) {
          adapterFailures.push(`LeekPay.checkout is missing required reviewed option: ${requiredOption}`)
        }
      }
    }
  }

  return adapterFailures
}

function validateProviderDialog(source) {
  const providerFailures = []
  if (!/from\s*["']@\/lib\/leekpay["']/.test(source)) {
    providerFailures.push(`Provider dialog must import the reviewed ${leekPayAdapterPath} adapter`)
  }
  if (!/\bLeekPay\b/.test(source)) {
    providerFailures.push('Provider dialog must display the LeekPay provider')
  }
  if (!/\b(?:XOF|LEEKPAY_CHECKOUT_CURRENCY)\b/.test(source)) {
    providerFailures.push('Provider dialog must disclose the LeekPay charge currency XOF')
  }
  if (/\bXAF\b/.test(source)) {
    providerFailures.push('Provider dialog must not pass or display XAF as the LeekPay charge currency')
  }
  if (/<(?:form|input|select|textarea)\b|\bcontentEditable\b/i.test(source)) {
    providerFailures.push('Provider dialog must not contain forms or data-entry controls')
  }
  if (/\b(?:customerEmail|customerName|customerPhone|customer_email|customer_name|customer_phone|email|phone|cardNumber|card_number|cvv|pan)\b/i.test(source)) {
    providerFailures.push('Provider dialog must not collect personal or card data')
  }
  if (source.includes(leekPaySdkUrl) || source.includes(allowedLeekPayPublicKey)) {
    providerFailures.push(`Provider dialog must delegate SDK details to ${leekPayAdapterPath}`)
  }
  if (!/returnUrl\s*:\s*new URL\([\s\S]*?payment-success/.test(source)) {
    providerFailures.push('Provider dialog must pass the same-origin payment-success return URL')
  }
  return providerFailures
}

function validateCatalogueProviderFlow(source) {
  const flowFailures = []
  if (!/\bDialogNotes\b/.test(source) || !/\bDialogProviders\b/.test(source)) {
    flowFailures.push('Card catalogue must render both usage-notes and provider dialogs')
  }
  if (!/<DialogNotes\b[\s\S]*?\bonAccept\s*=/.test(source)) {
    flowFailures.push('Card catalogue must open the provider flow through DialogNotes onAccept')
  }
  if (!/data\.amount\s*===\s*expectedAmount/.test(source)
    || !/data\.currency\s*===\s*LEEKPAY_CHECKOUT_CURRENCY/.test(source)
    || !/data\.status\s*===\s*["']paid["']/.test(source)
    || !/data\.payment_id/.test(source)) {
    flowFailures.push('Browser success callback must compare paid status, payment id, amount, and XOF currency with the selected card')
  }
  if (!/payment-success/.test(source) || !/payment-failure/.test(source)) {
    flowFailures.push('Card catalogue must route validated and rejected callbacks to separate result pages')
  }
  return flowFailures
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
  const relativePath = path.relative(projectRoot, file).split(path.sep).join('/')
  for (const rule of forbiddenAppPatterns) {
    if (rule.pattern.test(source)) failures.push(`${rule.label}: ${relativePath}`)
  }
  failures.push(...validateLeekPayUrls(source, relativePath))
  failures.push(...validateNoDirectSdkUse(source, relativePath))
  failures.push(...validateNoUiFetch(source, relativePath))
}

const appRouteSources = appFiles
  .map((file) => path.relative(projectRoot, file).split(path.sep).join('/'))
  .filter((relativePath) => /^src\/app\/(?:.+\/)?(?:page|route)\.(?:js|jsx|ts|tsx)$/.test(relativePath))
for (const expectedRoute of allowedRouteSources) {
  if (!appRouteSources.includes(expectedRoute)) {
    failures.push(`Required application route is missing: ${expectedRoute}`)
  }
}
for (const relativePath of appRouteSources) {
  if (!allowedRouteSources.has(relativePath)) {
    failures.push(`Unexpected application route: ${relativePath}`)
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
  const relativePath = path.relative(projectRoot, file).split(path.sep).join('/')
  if (isEnvironmentFile(file)) {
    for (const credential of findEnvironmentCredentials(source)) {
      const exposure = credential.key.toUpperCase().startsWith('NEXT_PUBLIC_')
        ? 'Browser-exposed credential in environment file'
        : 'Concrete credential in environment file'
      failures.push(`${exposure}: ${relativePath}:${credential.line} (${credential.key})`)
      environmentCredentials.push({ ...credential, relativePath })
    }
  }
  if (containsRetiredCredential(source)) {
    failures.push(`Retired credential restored: ${relativePath}`)
  }
  failures.push(...validatePaymentCredentials(source, relativePath))
  const secretScanSource = redactAllowedLeekPayPublicKey(source)
  for (const rule of highConfidenceSecretPatterns) {
    if (rule.pattern.test(secretScanSource)) failures.push(`${rule.label}: ${relativePath}`)
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
let providerDialogSource = ''
let leekPayAdapterSource = ''
for (const relativePath of requiredCardSurfacePaths) {
  if (!(await pathExists(relativePath))) {
    failures.push(`Required static card-purchase surface is missing: ${relativePath}`)
    continue
  }

  const source = await readFile(path.join(projectRoot, relativePath), 'utf8')
  cardSurfaceSources.push(source)
  if (relativePath === 'src/app/page.tsx') cardPageSource = source
  if (relativePath === usageNotesDialogPath) paymentDialogSource = source
  if (relativePath === providerDialogPath) providerDialogSource = source
  if (relativePath === leekPayAdapterPath) leekPayAdapterSource = source
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
  failures.push(...validateUsageNotesButtons(
    paymentDialogSource,
    usageNotesDialogPath,
  ))
}
if (cardPageSource) failures.push(...validateCatalogueProviderFlow(cardPageSource))
if (providerDialogSource) failures.push(...validateProviderDialog(providerDialogSource))
if (leekPayAdapterSource) failures.push(...validateLeekPayAdapter(leekPayAdapterSource))

if (await pathExists('src/components/layout/MainLayout.tsx')) {
  const mainLayout = await readFile(path.join(projectRoot, 'src/components/layout/MainLayout.tsx'), 'utf8')
  if (/WhatsAppChat|whatsapp-chat/i.test(mainLayout)) {
    failures.push('Global layout restores the retired WhatsApp personal-data flow')
  }
}

if (await pathExists('src/app/layout.tsx')) {
  const rootLayout = await readFile(path.join(projectRoot, 'src/app/layout.tsx'), 'utf8')
  const requiredCspDirectives = [
    "script-src 'self' 'unsafe-inline' https://leekpay.fr",
    "style-src 'self' 'unsafe-inline'",
    "connect-src 'self' https://leekpay.fr",
    "form-action 'none'",
    "frame-src 'none'",
  ]
  for (const directive of requiredCspDirectives) {
    if (!rootLayout.includes(directive)) {
      failures.push(`LeekPay-compatible CSP directive is missing or broadened: ${directive}`)
    }
  }
  if (/https:\/\/(?:\*\.)?leekpay\.me|https:\/\/\*\.leekpay\.fr/.test(rootLayout)) {
    failures.push('CSP must not trust wildcard LeekPay hosts or leekpay.me for scripts/connections')
  }
}

const paymentResultPath = 'src/components/payment/PaymentResult.tsx'
if (!(await pathExists(paymentResultPath))) {
  failures.push(`Required payment result component is missing: ${paymentResultPath}`)
} else {
  const paymentResultSource = await readFile(path.join(projectRoot, paymentResultPath), 'utf8')
  if (!/ne constitue pas une validation définitive/i.test(paymentResultSource)
    || !/not final validation/i.test(paymentResultSource)) {
    failures.push('Payment success UI must state that the browser callback is not final validation')
  }
  if (/\b(?:autoFulfill|fulfillOrder|issueCard|issueVirtualCard|provisionCard|deliverCard|revealCard|generateCard|activateCard)\s*\(/i.test(paymentResultSource)) {
    failures.push('Payment result UI must never auto-fulfill a card')
  }
}

for (const [routePath, expectedStatus] of [
  ['src/app/payment-success/page.tsx', 'success'],
  ['src/app/payment-failure/page.tsx', 'failure'],
]) {
  if (!(await pathExists(routePath))) continue
  const routeSource = await readFile(path.join(projectRoot, routePath), 'utf8')
  if (!new RegExp(`status=["']${expectedStatus}["']`).test(routeSource)) {
    failures.push(`Technical payment route does not render the ${expectedStatus} result: ${routePath}`)
  }
  if (!/index\s*:\s*false/.test(routeSource)) {
    failures.push(`Technical payment route must be noindex: ${routePath}`)
  }
}

let outputFileCount = 0
let outputHasLeekPaySdk = false
let outputHasApprovedLeekPayKey = false
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
      if (source.includes(leekPaySdkUrl)) outputHasLeekPaySdk = true
      if (source.includes(allowedLeekPayPublicKey)) outputHasApprovedLeekPayKey = true
      if (containsRetiredCredential(source)) {
        failures.push(`Retired credential present in production output: ${path.relative(projectRoot, file)}`)
      }
      const outputRelativePath = path.relative(projectRoot, file).split(path.sep).join('/')
      failures.push(...validatePaymentCredentials(source, outputRelativePath, true))
      failures.push(...validateLeekPayUrls(source, outputRelativePath, true))
      const secretScanSource = redactAllowedLeekPayPublicKey(source)
      for (const rule of highConfidenceSecretPatterns) {
        if (rule.pattern.test(secretScanSource)) {
          failures.push(`${rule.label} in production output: ${outputRelativePath}`)
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

    if (!outputHasLeekPaySdk) failures.push('Exact LeekPay SDK URL is missing from production output')
    if (!outputHasApprovedLeekPayKey) failures.push('Approved LeekPay pk_live public key is missing from production output')

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


    for (const route of ['payment-success', 'payment-failure']) {
      const candidates = [
        `out/${route}.html`,
        `out/${route}/index.html`,
      ]
      if (!(await Promise.all(candidates.map(pathExists))).some(Boolean)) {
        failures.push(`Required technical payment route is missing from production output: /${route}`)
      }
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
