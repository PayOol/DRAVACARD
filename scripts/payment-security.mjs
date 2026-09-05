import assert from 'node:assert/strict'
import ts from 'typescript'

export const commonPaymentPaths = [
  'src/lib/payment-api.ts', 'src/lib/payment-providers.ts', 'src/lib/leekpay.ts',
  'src/lib/tiktok-payment.ts', 'src/lib/tiktok-customer.ts',
  'src/components/payment/SebPayForm.tsx', 'src/components/payment/SharedPaymentProviders.tsx',
  'src/components/ui/dialog-providers.tsx', 'src/components/ui/dialog-checkout.tsx',
  'src/components/tiktok/TikTokCheckout.tsx', 'src/components/payment/PaymentResult.tsx',
  'worker/src/index.ts', 'worker/src/shared.ts', 'worker/src/providers.ts',
  'worker/src/payments.ts', 'worker/src/services.ts', 'worker/src/payment-types.ts', 'worker/src/tiktok.ts',
]
const proxy = 'https://drava-leekpay.sebpay-proxy.workers.dev'
const network = /\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon)\b/
const storage = /\b(?:localStorage|sessionStorage|indexedDB|caches)\b|document\.cookie/
const forbiddenFields = /\b(?:card_number|cardNumber|cvv|pan|customer_address)\b/i
const parse = (source) => ts.createSourceFile('review.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
const print = (node, file) => ts.createPrinter({ removeComments: true }).printNode(ts.EmitHint.Unspecified, node, file)
const code = (source) => ts.createPrinter({ removeComments: true }).printFile(parse(source)).replace(/\s+/g, '')
const walk = (node, fn) => { fn(node); ts.forEachChild(node, child => walk(child, fn)) }
const nodes = (source, predicate) => { const out = []; walk(parse(source), node => { if (predicate(node)) out.push(node) }); return out }
const name = (node) => node?.name && (ts.isIdentifier(node.name) || ts.isStringLiteral(node.name)) ? node.name.text : null
const calls = (source, target) => nodes(source, node => ts.isCallExpression(node) && node.expression.getText() === target)
const declaration = (source, target) => nodes(source, node => ts.isFunctionDeclaration(node) && node.name?.text === target)[0]
const functionCode = (source, target) => { const node = declaration(source, target); return node ? node.getText() : '' }
const requireAll = (failures, source, snippets, label) => { const c = code(source); const missing = snippets.filter(snippet => !c.includes(snippet)); if (missing.length) failures.push(`${label} (missing: ${missing.join(', ')})`) }
const exactFields = (source, target, expected) => {
  const node = nodes(source, n => ts.isInterfaceDeclaration(n) && n.name.text === target)[0]
  return Boolean(node && node.members.length === expected.length && node.members.every(m => ts.isPropertySignature(m) && expected.includes(name(m))))
}
const objectKeys = node => ts.isObjectLiteralExpression(node) ? node.properties.map(name) : []
const opening = node => ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)
const attribute = (node, key) => node.attributes.properties.find(a => ts.isJsxAttribute(a) && a.name.getText() === key)?.initializer
const expression = (node, key) => attribute(node, key)?.getText().replace(/\s+/g, '') ?? ''
const tagNodes = (source, tag) => nodes(source, node => opening(node) && node.tagName.getText() === tag)
function noPrivateSideEffects(source, failures, label) {
  const c = code(source)
  if (storage.test(c) || forbiddenFields.test(c) || /console\.(?:log|info|warn|error|debug)\(/.test(c)
    || /history\.(?:pushState|replaceState)\([^)]*(?:customer|email|phone|whatsapp|password|otp|orderToken)/i.test(c)) failures.push(`${label}: private data must not be stored, logged, or put in history`)
}

export function validateCommonPaymentApi(source) {
  const failures = [], c = code(source)
  if ((source.split(proxy).length - 1) !== 1 || !c.includes(`exportconstPAYMENT_API_BASE="${proxy}"`)) failures.push('Common payment API must declare the fixed proxy origin exactly once')
  const fetches = calls(source, 'fetch')
  if (fetches.length !== 1 || fetches[0].arguments[0]?.getText() !== '`${PAYMENT_API_BASE}${path}`') failures.push('Common payment API must contain one fetch to its fixed proxy transport')
  requireAll(failures, functionCode(source, 'requestPaymentApi'), [
    'method:body===undefined?"GET":"POST"', 'body:JSON.stringify(body)', 'credentials:"omit"', 'cache:"no-store"',
    'redirect:"error"', 'referrerPolicy:"no-referrer"', 'signal:controller.signal',
    'setTimeout(abort,20000)', 'clearTimeout(timeout)', 'signal?.addEventListener("abort",abort,{once:true})',
    'signal?.removeEventListener("abort",abort)',
  ], 'Common payment transport must retain exact methods, body encoding, privacy, cancellation and deadline safeguards')
  requireAll(failures, functionCode(source, 'readJson'), ['131072', 'response.body?.getReader()', 'length>131072', 'reader.cancel()', 'reader.releaseLock()', 'fatal:true'], 'Common payment responses must remain bounded and strictly decoded')
  if (!exactFields(source, 'PaymentSelection', ['service','productId','customCoins']) || !exactFields(source, 'PaymentInput', ['country','operator','phone','otpCode'])
    || !exactFields(source, 'PaymentCheckoutInput', ['selection','provider','customer','consent','payment'])) failures.push('Common payment request types may contain only reviewed service, customer and Mobile Money fields')
  requireAll(failures, functionCode(source, 'selectionBody'), ['service!=="cards"&&service!=="tiktok"', 'cardIds:packIds', 'customCoins<70', 'customCoins>1000000', 'productId!=="custom"&&customCoins!==undefined'], 'Payment selections must be validated against the service catalogues and custom quantity limits')
  const checkout = functionCode(source, 'createPaymentCheckout')
  requireAll(failures, checkout, ['selectionBody(input.selection)', 'normalizeTikTokCustomer(input.customerasTikTokCustomer)', 'normalizePaymentCustomer(input.customer)', 'input.consent!==true', '!isPaymentProvider(input.provider)', '"/api/checkout"', '...selection,provider:input.provider,customer,consent:true,', 'country:input.payment.country,operator:input.payment.operator,phone:input.payment.phone,', 'otpCode:input.payment.otpCode', 'data.service!==selection.service', 'data.productId!==selection.productId', 'data.provider!==input.provider', '!isValidOrderToken(data.orderToken)', 'isSafePaymentUrl(data.checkoutUrl)'], 'Common checkout must normalize customers, require consent and send only a validated selection/payment to the shared endpoint')
  const checkoutCall = calls(source, 'requestPaymentApi').find(node => node.arguments[0]?.getText() === '"/api/checkout"')
  if (!checkoutCall || objectKeys(checkoutCall.arguments[1]).some(key => key && !['provider','customer','consent'].includes(key))) failures.push('Checkout transport must not accept client amounts, currency, redirects or extra fields')
  const status = calls(source, 'requestPaymentApi').find(node => node.arguments[0]?.getText() === '"/api/orders/status"')
  if (!status || JSON.stringify(objectKeys(status.arguments[1])) !== '["orderToken"]') failures.push('Status transport must send only the opaque order token')
  requireAll(failures, functionCode(source, 'getPaymentOrderStatus'), ['!isValidOrderToken(orderToken)', 'data.verified!==(data.status==="paid")', '!positive(data.amount)', '!currency(data.currency)', 'data.currency!==(service==="cards"?"XOF":"XAF")', 'cardIds:packIds'], 'Payment status must validate service/product, amount/currency, token and paid/verified consistency')
  requireAll(failures, checkout, ['data.currency!==(selection.service==="cards"?"XOF":"XAF")'], 'Checkout must retain the XOF cards/XAF TikTok currency boundary')
  requireAll(failures, source, ['/^#order=([a-f0-9]{64})$/', '/^[a-f0-9]{64}$/', 'url.protocol==="https:"&&!url.port&&!url.username&&!url.password', '"/api/providers"', 'data.providers.length!==PAYMENT_PROVIDERS.length', '"/api/providers/sebpay/countries"', '"/api/providers/sebpay/quote"'], 'Common payment capabilities, redirect URLs and provider endpoints must remain constrained')
  const approvedRoutes = new Set(['/api/providers','/api/checkout','/api/orders/status','/api/providers/sebpay/countries','/api/providers/sebpay/quote'])
  if (calls(source, 'requestPaymentApi').some(call => !ts.isStringLiteral(call.arguments[0]) || !approvedRoutes.has(call.arguments[0].text))) failures.push('Payment transport may be called only with reviewed constant API paths')
  noPrivateSideEffects(source, failures, 'Common payment API')
  return failures
}

export function validateProviderRegistry(source) {
  const failures = [], file = parse(source)
  const variable = nodes(source, n => ts.isVariableDeclaration(n) && n.name.getText() === 'PAYMENT_PROVIDERS')[0]
  const initializer = variable?.initializer
  const array = initializer && ts.isAsExpression(initializer) ? initializer.expression : initializer
  const expected = ['leekpay','soleaspay','sebpay'], fields = ['id','name','logo','logoClassName','recommended','flow']
  if (!array || !ts.isArrayLiteralExpression(array) || array.elements.length !== 3) failures.push('Provider registry must declare the three reviewed global providers')
  else array.elements.forEach((item, index) => {
    if (!ts.isObjectLiteralExpression(item) || item.properties.length !== fields.length || item.properties.some(p => !ts.isPropertyAssignment(p) || !fields.includes(name(p)) || !(ts.isStringLiteral(p.initializer) || [ts.SyntaxKind.TrueKeyword,ts.SyntaxKind.FalseKeyword].includes(p.initializer.kind)))) { failures.push('Provider registry must contain literal presentation metadata only'); return }
    const values = Object.fromEntries(item.properties.map(p => [name(p), ts.isStringLiteral(p.initializer) ? p.initializer.text : p.initializer.kind === ts.SyntaxKind.TrueKeyword]))
    if (values.id !== expected[index] || values.flow !== (values.id === 'sebpay' ? 'mobile-money' : 'redirect') || !/^\/images\/[A-Za-z0-9/_-]+\.(?:png|webp|svg)$/.test(values.logo)) failures.push('Provider registry IDs, flow and local logo paths must remain reviewed')
  })
  if (network.test(code(source)) || storage.test(code(source)) || /https?:|apiKey|secret|customer|orderToken|process\.env/i.test(print(file,file))) failures.push('Provider registry must not contain transport, credentials or customer data')
  return failures
}

export function validateSebPayForm(source) {
  const failures = [], controls = nodes(source, n => opening(n) && ['form','input','select','textarea'].includes(n.tagName.getText()))
  if (controls.length !== 5 || tagNodes(source,'form').length !== 1 || tagNodes(source,'input').length !== 2 || tagNodes(source,'select').length !== 2) failures.push('Shared SebPay form may contain only one form, phone/OTP inputs and country/operator selectors')
  for (const node of controls) {
    const tag = node.tagName.getText(), value = expression(node,'value')
    if (node.attributes.properties.some(ts.isJsxSpreadAttribute) || attribute(node,'action') || attribute(node,'formAction')) failures.push('SebPay controls must not spread unknown attributes or submit to a native action')
    if (tag === 'form' && expression(node,'onSubmit') !== '{submitForm}') failures.push('SebPay form must use only its reviewed submit handler')
    if (tag === 'select' && !['{country}','{operator}'].includes(value)) failures.push('SebPay selectors may collect only country/operator')
    if (tag === 'input' && !['{phone}','{otp}'].includes(value)) failures.push('SebPay inputs may collect only phone/OTP')
    if (tag === 'input' && value === '{phone}' && (expression(node,'type') !== '"tel"' || expression(node,'autoComplete') !== '"tel-national"' || expression(node,'maxLength') !== '{15}')) failures.push('SebPay phone must remain a bounded telephone input')
    if (tag === 'input' && value === '{otp}' && (expression(node,'autoComplete') !== '"one-time-code"' || expression(node,'maxLength') !== '{64}')) failures.push('SebPay OTP must remain a bounded one-time code')
  }
  requireAll(failures, source, ['getSebPayCountries(controller.signal)', 'getSebPayQuote(', 'selection:{service,productId,', 'country,operator,', 'if(!selected||!quote||busy||submitting.current)return', 'selected.prefix+phone', '/^[1-9][0-9]{7,14}$/', 'quote.otpRequired&&!otp.trim()', 'awaitonSubmit({country,operator,phone:normalized,', 'quote.otpRequired?{otpCode:otp.trim()}:{}', 'submitting.current=true', 'submitting.current=false', 'return()=>controller.abort()'], 'Shared SebPay form must use global queries, validate phone/OTP, prevent duplicate submission and cancel stale requests')
  if (network.test(code(source)) || /createPaymentCheckout|createTikTokCheckout|tiktok-payment|window\.location/.test(code(source))) failures.push('SebPay form must delegate payment creation and use no service-specific transport')
  noPrivateSideEffects(source, failures, 'SebPay form')
  return failures
}

function validateServiceWrapper(source, service) {
  const failures = []
  if (network.test(code(source)) || /https?:\/\//.test(source)) failures.push(`${service} wrapper must not own payment transport or origins`)
  requireAll(failures, source, ['from"./payment-api.ts"', 'createPaymentCheckout(', 'getPaymentOrderStatus(', `service:"${service}"`, `result.service!=="${service}"`], `${service} wrapper must delegate to the common client and check its service result`)
  if (service === 'cards') requireAll(failures, source, ['result.currency!==LEEKPAY_CHECKOUT_CURRENCY', 'LEEKPAY_CHECKOUT_CURRENCY="XOF"'], 'Legacy cards wrapper must retain its XOF contract')
  noPrivateSideEffects(source, failures, `${service} wrapper`)
  return failures
}

function validateProviderSelection(source) {
  const failures = []
  requireAll(failures, source, ['PAYMENT_PROVIDERS.map(', 'getPaymentProviders(controller.signal)', 'notify.current?.(next)', 'controller.signal.aborted', 'return()=>controller.abort()', 'disabled={disabled||state.loading||state.error}', 'unavailable={state.providers?.find((item)=>item.id===provider.id)?.available===false}', 'onSelect={()=>onChange(provider.id)}', 'onClick={()=>setRevision((current)=>current+1)}'], 'Shared provider selection must use the global registry and availability, cancel stale work and offer a controlled retry')
  if (tagNodes(source,'CheckoutProviderOption').length !== 1 || network.test(code(source)) || /createPaymentCheckout|window\.location|customer|orderToken|password|whatsapp/.test(code(source))) failures.push('Shared provider selection must only select a provider, never collect or submit payment data')
  noPrivateSideEffects(source, failures, 'Provider selection')
  return failures
}

function validateCardProviders(source) {
  const failures = []
  if (!exactFields(source, 'PaymentProvidersProps', ['card','customer','provider','phase','onProviderChange','onConfigure','onBusyChange','onOrderCreated','onClose','onBack'])) failures.push('Card provider controller must expose only the reviewed selection, phase and lifecycle callbacks')
  requireAll(failures, source, ['createPaymentCheckout(', 'selection:{service:"cards",productId:card.id}', 'provider,customer,consent:true,', 'controller.signal', 'if(requestRef.current||!selectedProvider)return', 'if(!controller.signal.aborted)', 'if(!available||requestRef.current||!selectedProvider)return', 'selectedProvider.flow==="mobile-money"', 'onConfigure()', 'elsevoidsubmit()', 'if(checkout.checkoutUrl)window.location.assign(checkout.checkoutUrl)', 'setCreatedOrder({orderToken:checkout.orderToken,providerLink:checkout.providerLink', 'orderToken={createdOrder.orderToken}', 'providerLink={createdOrder.providerLink}', 'requestRef.current?.abort()', 'window.addEventListener("pageshow",handlePageShow)', 'window.removeEventListener("pageshow",handlePageShow)', 'notifyBusy.current(true)', 'notifyBusy.current(false)', 'if(!isPresent&&requestRef.current)', 'onClick={handleCheckout}', 'disabled={isProcessing||!available}', 'onSubmit={submit}'], 'Card providers must use the global checkout with validated selection, guarded submission, abortable lifecycle and trusted return capability')
  if (calls(source,'createPaymentCheckout').length !== 1 || tagNodes(source,'SebPayForm').length !== 1 || tagNodes(source,'SharedPaymentProviders').length !== 1 || network.test(code(source)) || /DialogPrimitive\.(?:Root|Portal|Content)/.test(source)) failures.push('Card provider controller must share the single selector/form without nested dialogs or transport')
  noPrivateSideEffects(source, failures, 'Card provider controller')
  return failures
}

// XAF is required only for a validated TikTok order. Permit that literal solely
// inside a currency mismatch guard whose other service branch remains XOF.
// The same AST rule applies to minified output; arbitrary XAF use stays rejected.
export function allowReviewedPaymentCurrency(source) {
  const file = parse(source), literals = []
  walk(file,node=>{if(ts.isStringLiteral(node)&&node.text==='XAF')literals.push(node)})
  if (!literals.length || literals.length !== (source.match(/\bXAF\b/g)?.length ?? 0)) return false
  const unwrap = node => { while(ts.isParenthesizedExpression(node)) node=node.expression; return node }
  return literals.every(node=>{
    const conditional=node.parent
    if(!ts.isConditionalExpression(conditional) || conditional.whenFalse!==node || !ts.isStringLiteral(conditional.whenTrue) || conditional.whenTrue.text!=='XOF')return false
    const condition=unwrap(conditional.condition)
    if(!ts.isBinaryExpression(condition) || condition.operatorToken.kind!==ts.SyntaxKind.EqualsEqualsEqualsToken || ![condition.left,condition.right].some(side=>ts.isStringLiteral(side)&&side.text==='cards'))return false
    let expression=conditional
    while(ts.isParenthesizedExpression(expression.parent))expression=expression.parent
    const comparison=expression.parent
    return ts.isBinaryExpression(comparison) && comparison.operatorToken.kind===ts.SyntaxKind.ExclamationEqualsEqualsToken && [comparison.left,comparison.right].some(side=>{side=unwrap(side);return ts.isPropertyAccessExpression(side)&&side.name.text==='currency'})
  })
}

export function validateCardCheckout(source) {
  const failures = []
  if (!exactFields(source,'DialogCheckoutProps',['card','onClose'])) failures.push('Card checkout props must contain only card and onClose')
  requireAll(failures, source, [
    'useState<CheckoutStep>("notes")', 'const[isOpen,setIsOpen]=useState(true)', 'constvalidCustomer=normalizePaymentCustomer(customer)',
    'step==="notes"?', 'step==="customer"?', 'validCustomer?', 'customer={validCustomer}',
    'setStep("customer");setLocationRequested(true)', 'setCustomer(details);setStep("providers")',
    'phase={step==="payment"?"payment":"providers"}', 'onConfigure={()=>setStep("payment")}',
    'onBusyChange={onBusyChange}', 'setStep(step==="payment"?"providers":"customer")',
    'canDismiss={!paymentBusy}', 'if(closeRequestedRef.current||paymentBusyRef.current)return',
    'if(!closeRequestedRef.current||closeFinishedRef.current)return', 'closeFinishedRef.current=true',
    'setIsOpen(false)', 'if(reducedMotion)finishClose()', 'onClosedRef.current()',
    'window.setTimeout(finishClose,reducedMotion?0:260)', 'window.clearTimeout(timeout)',
    'dialogElement.inert=!isOpen', 'titleRef.current?.focus(', 'onCloseAutoFocus=',
    'scrollTop={scrollPositions.current[step]}', 'scrollPositions.current[step]=position',
    'notes:0,customer:0,providers:0,payment:0', 'useReducedMotion()===true', '<AnimatePresenceinitial={false}mode="sync">',
    'window.addEventListener("popstate",handleBack)', 'window.removeEventListener("popstate",handleBack)',
    'if(paymentBusyRef.current)', 'requestAnimationFrame', 'if(!locationRequested)return',
    'detectCustomerLocation(controller.signal)', 'if(!location||controller.signal.aborted)return',
    'whatsappEditedRef.current||current.whatsapp?current:', 'return()=>controller.abort()',
  ], 'Card checkout must preserve consent/customer gates, busy dismissal, focus, history, scroll, reduced motion and non-overwriting location detection')
  if (network.test(code(source)) || /createPaymentCheckout|window\.location|DialogPrimitive\.(?:Root|Portal|Content)/.test(code(source))) failures.push('Card shell controller must not initiate payment or create nested dialogs')
  if (/notes-exiting|checkoutStep|DialogNotes|DialogProviders/.test(source)) failures.push('Card checkout must not restore the retired multi-dialog lifecycle')
  for (const component of ['UsageNotes','CustomerDetails','PaymentProviders','CheckoutShell','CheckoutPanel']) if (tagNodes(source,component).length !== 1) failures.push(`Card checkout must mount one shared ${component}`)
  noPrivateSideEffects(source, failures, 'Card checkout')
  return failures
}

function validateTikTokCheckout(source) {
  const failures = []
  requireAll(failures, source, ['createPaymentCheckout(', 'service:"tiktok",productId:pack.id', 'customCoins:pack.coins', 'selection,provider,customer:{username,password,email,whatsapp:fullPhone()},consent:accepted,', 'if(submitting.current||!accepted||!customerValid||!validateEmail())return', 'submitting.current=true', 'setPassword("")', 'if(controller.signal.aborted)return', 'requestController.current?.abort()', 'SharedPaymentProviders', 'onAvailabilityChange={setProviderState}', 'SebPayForm', 'selection={selection}', 'onSubmit={submit}', 'mobileMoney', 'if(!accepted||locationRequested.current)return', 'manualCountry.current||manualPhone.current', 'canDismiss={!busy}', 'dialogElement.inert=!isOpen', 'title.current?.focus(', 'onCloseAutoFocus=', 'scrollTop={scrollPositions.current[step]}'], 'TikTok checkout must retain business validation, consent, common provider/form, guarded requests and mobile state protection')
  if (calls(source,'createPaymentCheckout').length !== 1 || network.test(code(source)) || /getTikTokProviders|getTikTokSebPay|functionSebPayForm/.test(code(source))) failures.push('TikTok checkout must not duplicate global provider queries, form or transport')
  noPrivateSideEffects(source, failures, 'TikTok checkout')
  return failures
}

function validateCommonResult(source) {
  const failures = []
  requireAll(failures, source, ['getPaymentOrderStatus(', 'readOrderToken(window.location.hash)', 'window.history.replaceState(null,"",window.location.pathname)', 'result.service!=="cards"', 'result.status==="paid"&&result.verified===true', 'verification==="paid"&&order?.verified===true', 'setTimeout(poll', 'Math.min(delay*2', 'if((isPaid&&order)||isSimulation)', 'amount={isPaid&&order?order.amount:5000}', 'createdAt={isPaid&&order?order.createdAt:Date.UTC(2026,8,5,12)}', 'process.env.NODE_ENV==="development"', '["localhost","127.0.0.1","[::1]"].includes(window.location.hostname)', 'window.location.hash==="#simulation"', 'setOrder(null)'], 'Card result must verify a common server order, remove URL capabilities and keep local simulation separate from payment evidence')
  const simulation = nodes(source,node=>ts.isIfStatement(node)&&node.expression.getText().includes('#simulation'))
  if(simulation.length!==1) failures.push('Local simulation must have exactly one guarded entry')
  else requireAll(failures,simulation[0].expression.getText(),['process.env.NODE_ENV==="development"','["localhost","127.0.0.1","[::1]"].includes(window.location.hostname)','window.location.hash==="#simulation"'],'Simulation entry must require development mode, loopback host and explicit simulation fragment together')
  if (/URLSearchParams|searchParams|fetch\(/.test(code(source))) failures.push('Card result must not derive payment evidence from query parameters or bypass its common verifier')
  noPrivateSideEffects(source, failures, 'Card result')
  return failures
}

export function validateCommonWorker(sources) {
  const failures = [], get = name => sources[`worker/src/${name}.ts`] ?? ''
  const index = get('index'), shared = get('shared'), providers = get('providers'), payments = get('payments'), services = get('services'), types = get('payment-types'), tiktok = get('tiktok')
  requireAll(failures, index, ['allowedOrigin(request,env)', 'Object.hasOwn(PAYMENT_ROUTES,url.pathname)', 'if((!location&&!route)||url.search)', 'if(!origin)thrownewApiError(403,"origin_forbidden")', 'request.method!==method', 'Access-Control-Request-Method', 'Access-Control-Request-Headers', 'awaitenforceRateLimit(request,env,route==="checkout")', 'if(location)returnlocationResponse(request,origin)', 'handlePaymentRequest(request,env,origin,route)'], 'Worker routing must remain queryless, origin/method/header checked and rate-limited before common dispatch')
  requireAll(failures, shared, ['SITE_ORIGIN="https://drava.click"', 'origin===SITE_ORIGIN', 'local.origin===origin', 'local.protocol==="http:"', 'local.hostname==="localhost"||local.hostname==="127.0.0.1"', 'returnnull', '"Cache-Control":"no-store,max-age=0"', '"Referrer-Policy":"no-referrer"', '"X-Content-Type-Options":"nosniff"', '"X-Frame-Options":"DENY"', 'env.CREATE_LIMITER:env.STATUS_LIMITER', 'if(!result.success)thrownewApiError(429,"rate_limited")', 'thrownewApiError(503,"service_unavailable")'], 'Worker must retain exact CORS, loopback opt-in, private response headers and fail-closed rate limiting')
  requireAll(failures, functionCode(shared,'readBoundedJson'), ['Number(declaredSize)>limit', 'size>limit', 'fatal:true', 'PROVIDER_TIMEOUT_MS', 'reader.cancel()', 'reader.releaseLock()', 'clearTimeout(timeout)'], 'Worker request/upstream bodies must be size-, time- and UTF-8 bounded')
  const location = functionCode(shared,'locationResponse')
  requireAll(failures, location, ['request.cf?.country', '/^[A-Z]{2}$/', '!isSupportedCountry(country)', 'countryCode:null,callingCode:null', 'countryCode:country,callingCode:`+${getCountryCallingCode(country)}`'], 'Worker location must derive only country/calling code from Cloudflare metadata')
  if (network.test(code(location)) || /headers\.get|ORDERS|console\.|latitude|longitude|postal|city/.test(code(location))) failures.push('Worker location must not use browser hints, detailed location, storage, logs or upstreams')
  requireAll(failures, functionCode(shared,'orderKey'), ['crypto.subtle.digest("SHA-256",newTextEncoder().encode(token))'], 'Worker must hash capability tokens before using them as storage keys')
  requireAll(failures, functionCode(shared,'safeCheckoutUrl'), ['value.length>2048', 'url.protocol!=="https:"||url.username||url.password||url.port'], 'Worker checkout URLs must be bounded HTTPS URLs without embedded credentials')
  const routeValues = { '/api/providers':'providers', '/api/checkout':'checkout', '/api/orders/status':'status', '/api/providers/sebpay/countries':'countries', '/api/providers/sebpay/quote':'quote', '/api/tiktok/providers':'providers', '/api/tiktok/checkout':'checkout', '/api/tiktok/orders/status':'status', '/api/tiktok/sebpay/countries':'countries', '/api/tiktok/sebpay/quote':'quote' }
  const routes = nodes(payments,n => ts.isVariableDeclaration(n) && n.name.getText() === 'PAYMENT_ROUTES')[0]?.initializer
  const routeArg = routes && ts.isCallExpression(routes) ? routes.arguments[0] : null
  const routeObject = routeArg && ts.isAsExpression(routeArg) ? routeArg.expression : routeArg
  if (!routeObject || !ts.isObjectLiteralExpression(routeObject) || routeObject.properties.length !== Object.keys(routeValues).length || routeObject.properties.some(p => !ts.isPropertyAssignment(p) || !ts.isStringLiteral(p.initializer) || routeValues[name(p)] !== p.initializer.text)) failures.push('Worker routes and legacy aliases must target exactly the same reviewed payment engine')
  requireAll(failures, functionCode(payments,'paymentMethod'), ['route==="providers"||route==="countries"?"GET":"POST"'], 'Worker checkout, status and quote must remain POST; only public catalogues may use GET')
  requireAll(failures, functionCode(payments,'createCheckout'), ['requestJson(request)', 'exactKeys(', '"service","productId","customCoins","provider","customer","consent","payment"', 'payload.consent!==true', '!isProvider(payload.provider)', 'selectProduct(service,productId,payload.customCoins)', 'validateCustomer(service,payload.customer)', 'ensureServiceReady(env,service)', 'crypto.getRandomValues(newUint8Array(32))', 'awaitorderKey(orderToken)', 'amount:selected.amount,currency:selected.currency', 'prepareProviderPayment(', 'prepareFulfillment(env,key,order,client)', 'createProviderPayment(env,provider,intent,prepared)', 'awaitenv.ORDERS.put(key,JSON.stringify(record),{expirationTtl:ORDER_TTL_SECONDS'], 'Worker checkout must reject extra fields, validate consent/customer/product, calculate server amounts and store durable expiring verification facts')
  // providerId is assigned only after authenticated creation; either spelling is reviewed.
  const create = code(functionCode(payments,'createCheckout'))
  if (!create.includes('order.providerId=transaction.providerId') && !create.includes('providerId:transaction.providerId')) failures.push('Worker must store the authenticated provider identifier')
  if (create.indexOf('awaitenv.ORDERS.put') > create.indexOf('returnjsonResponse(') || create.indexOf('awaitenv.ORDERS.put') < 0) failures.push('Worker must persist verification facts before returning a payable URL')
  requireAll(failures, functionCode(payments,'orderStatus'), ['requestJson(request,1024)', 'Object.keys(payload).length!==1', '/^[a-f0-9]{64}$/', 'awaitorderKey(payload.orderToken)', 'env.ORDERS.get(key,"json")', 'normalizeOrder(value)', 'order.expiresAt<=Date.now()', 'awaitverifyProviderPayment(env,order)', 'constverified=status==="paid"', 'verified?awaitcompleteFulfillment(env,key,order):{}'], 'Worker status must verify an unexpired stored order with its provider before any paid result or fulfillment')
  const orderType = nodes(types,n=>ts.isTypeAliasDeclaration(n)&&n.name.text==='Order')[0]?.getText() ?? ''
  if (!orderType || /\b(?:customer|email|whatsapp|phone|password|otpCode)\b/.test(orderType) || /\b(?:client|customer|password|otpCode)\s*:/.test(create.match(/constorder:Order=\{.*?\};/)?.[0] ?? '')) failures.push('Verification records must exclude customer credentials, contacts and OTP')
  requireAll(failures, functionCode(payments,'normalizeOrder'), ['value.version!==1&&value.version!==2', 'value.expiresAt!==value.createdAt+ORDER_TTL_SECONDS*1000', 'isProviderReference(value.provider,value.providerId)', '!positiveAmount(value.providerAmount)'], 'Legacy and new orders must retain expiry and stored provider-amount validation')
  for (const [id,amount] of [['visa-basic',5000],['mastercard-basic',6000],['mastercard-premium',8500],['mastercard-platinum',15000]]) {
    if (!new RegExp(`"${id}":\\{amount:${amount},`).test(code(services))) failures.push(`Server card catalogue must retain ${id}/${amount}`)
  }
  requireAll(failures, services, ['normalizePaymentCustomer(value)', 'tiktok.customer(value)', 'tiktok.selection({packId:productId,customCoins})', 'currency:"XOF"', 'currency:"XAF"', 'amount:product.amount', 'payment-success/#order=${token}', 'payment-failure/#order=${token}', 'order.service==="tiktok"?tiktok.notifyOrder(env,key,order):{}'], 'Service adapters must own canonical customers, server catalogue, fragment return URLs and separate TikTok fulfillment')
  if (network.test(code(services)) || /leekpay|sebpay|soleaspay/i.test(services)) failures.push('Service modules must not branch on providers or own provider transport')
  if (calls(providers,'fetch').length !== 2 || calls(tiktok,'fetch').length !== 1) failures.push('Only the two reviewed provider transports and one EmailJS transport may issue upstream requests')
  for (const [label, source] of [['index',index],['shared',shared],['payments',payments],['services',services]]) if (calls(source,'fetch').length) failures.push(`Worker ${label} must delegate upstream transport`)
  requireAll(failures, providers, ['"https://leekpay.fr/api/v1/checkout"', '"https://newapi.sebpay.bj/api/v1"', 'Authorization:`Bearer${env.LEEKPAY_SECRET_KEY}`', '"X-Public-Key":env.SEBPAY_PUBLIC_KEY', '"X-Secret-Key":env.SEBPAY_SECRET_KEY', 'redirect:"manual"', 'signal:controller.signal', 'readBoundedJson(', 'clearTimeout(timeout)', 'checkoutId?"GET":"POST"', 'safeCheckoutUrl(data.payment_url)', 'soleaspay:{available:()=>false', 'configured(env,order.provider).verify(env,order)', 'configured(env,provider).create(env,intent,prepared)', 'exactKeys(value,["country","operator","phone","otpCode"])', 'calculated.otpRequired', 'customer_email:intent.customer.email', 'customer_phone:intent.customer.whatsapp'], 'Provider adapters must authenticate fixed endpoints, reject redirects, bound responses, share creation/status and keep unsupported providers unavailable')
  requireAll(failures, providers, ['data.id!==order.providerId', 'data.amount!==order.providerAmount', 'data.currency!==order.providerCurrency', 'data.transaction_id!==order.providerId', 'data.external_reference!==order.orderId', 'number(data.amount)!==order.providerAmount', '!isPaymentStatus(data.status)', 'returnsebpayStatus(data.status)'], 'Every provider confirmation must match the stored ID, amount, currency and external order reference')
  const registryInit=nodes(providers,node=>ts.isVariableDeclaration(node)&&node.name.getText()==='registry')[0]?.initializer
  const registry=registryInit&&ts.isCallExpression(registryInit)?registryInit.arguments[0]:null
  for(const id of ['leekpay','sebpay']) {
    const provider=registry&&ts.isObjectLiteralExpression(registry)?registry.properties.find(property=>name(property)===id):null
    const object=provider&&ts.isPropertyAssignment(provider)?provider.initializer:null
    const verify=object&&ts.isObjectLiteralExpression(object)?object.properties.find(property=>ts.isMethodDeclaration(property)&&name(property)==='verify'):null
    requireAll(failures,verify?.body?.getText()??'',id==='leekpay'
      ? ['data.id!==order.providerId','data.amount!==order.providerAmount','data.currency!==order.providerCurrency','!isPaymentStatus(data.status)']
      : ['data.transaction_id!==order.providerId','data.external_reference!==order.orderId','number(data.amount)!==order.providerAmount','data.currency!==order.providerCurrency','returnsebpayStatus(data.status)'],`${id} verification must independently check its authenticated stored identity, amount and currency`)
  }
  const transports = calls(providers,'fetch').map(n=>n.arguments[0]?.getText())
  if (!transports.includes('`${SEBPAY_API}${path}`') || !transports.some(t=>t?.includes('`${CHECKOUT_API}/${checkoutId}`'))) failures.push('Provider fetch destinations must derive only from their fixed authenticated APIs')
  for(const call of calls(providers,'fetch')) requireAll(failures,`(${call.arguments[1]?.getText()??''})`,['redirect:"manual"','signal:controller.signal'],'Every provider request must prevent credential forwarding across redirects and honor cancellation')
  requireAll(failures, tiktok, ['crypto.subtle.encrypt(', 'crypto.subtle.decrypt(', 'name:"AES-GCM"', 'additionalData:newTextEncoder().encode(orderId)', 'crypto.getRandomValues(newUint8Array(12))', 'awaitseal(client,order.orderId,env)', 'expirationTtl:TTL', '"https://api.emailjs.com/api/v1.0/email/send"', 'if(!response.ok)returnresult("pending")', 'awaitenv.ORDERS.delete(`${storageKey}:customer`)'], 'TikTok credentials must remain encrypted with bound order identity, finite TTL and deletion only after confirmed delivery')
  for(const operation of ['seal','unseal']) requireAll(failures,functionCode(tiktok,operation),['name:"AES-GCM"','additionalData:newTextEncoder().encode(orderId)'],`TikTok ${operation} must bind encryption to the verified order identity`)
  if (/newapi\.sebpay|leekpay\.fr|soleaspay/i.test(tiktok)) failures.push('TikTok fulfillment must not retain a provider integration')
  for (const [label,source] of Object.entries(sources).filter(([p])=>p.startsWith('worker/src/'))) {
    if (forbiddenFields.test(code(source)) || storage.test(code(source))) failures.push(`Worker contains unreviewed collection/storage: ${label}`)
    for (const call of nodes(source,n=>ts.isCallExpression(n)&&/^console\.(?:log|error|info|warn|debug)$/.test(n.expression.getText()))) {
      const text = code(call.getText())
      if (!text.startsWith('console.error(JSON.stringify({') || /\b(?:customer|client|email|whatsapp|phone|password|otpCode|orderToken)\b/.test(text) || /error\.(?:message|stack)|JSON.stringify\(error\)/.test(text)) failures.push(`Worker logs must contain only reviewed diagnostic categories: ${label}`)
    }
  }
  return failures
}

export function validateCommonPaymentArchitecture(sources) {
  const failures = []
  for (const path of commonPaymentPaths) if (!sources[path]) failures.push(`Required common payment module is missing: ${path}`)
  const get = path => sources[path] ?? ''
  failures.push(...validateCommonPaymentApi(get('src/lib/payment-api.ts')),
    ...validateProviderRegistry(get('src/lib/payment-providers.ts')),
    ...validateServiceWrapper(get('src/lib/leekpay.ts'),'cards'),
    ...validateServiceWrapper(get('src/lib/tiktok-payment.ts'),'tiktok'),
    ...validateSebPayForm(get('src/components/payment/SebPayForm.tsx')),
    ...validateProviderSelection(get('src/components/payment/SharedPaymentProviders.tsx')),
    ...validateCardProviders(get('src/components/ui/dialog-providers.tsx')),
    ...validateCardCheckout(get('src/components/ui/dialog-checkout.tsx')),
    ...validateTikTokCheckout(get('src/components/tiktok/TikTokCheckout.tsx')),
    ...validateCommonResult(get('src/components/payment/PaymentResult.tsx')),
    ...validateCommonWorker(sources))
  return failures
}

export async function runPaymentSecuritySelfTests(readSource) {
  const sources = Object.fromEntries(await Promise.all(commonPaymentPaths.map(async path => [path, await readSource(path)])))
  assert.deepEqual(validateCommonPaymentArchitecture(sources), [], 'Reviewed common payment architecture must pass')
  assert.equal(allowReviewedPaymentCurrency('data.currency !== (service === "cards" ? "XOF" : "XAF")'),true)
  assert.equal(allowReviewedPaymentCurrency('data.currency!==("cards"===e?"XOF":"XAF")'),true)
  for(const invalid of ['const currency="XAF"','data.currency !== (service === "cards" ? "USD" : "XAF")','data.currency === (service === "cards" ? "XOF" : "XAF")','data.currency !== (service === "cards" ? "XOF" : "XAF");const extra="XAF"'])assert.equal(allowReviewedPaymentCurrency(invalid),false)
  function mutate(source, before, after) {
    const chars = [...source].map((character,index)=>({character,index})).filter(({character})=>!(/\s/.test(character)))
    const offset = chars.map(({character})=>character).join('').indexOf(before)
    assert.ok(offset >= 0, `Payment security mutation target missing: ${before}`)
    return source.slice(0,chars[offset].index) + after + source.slice(chars[offset + before.length - 1].index + 1)
  }
  const cases = [
    ['src/lib/payment-api.ts', proxy, 'https://example.test'],
    ['src/lib/payment-api.ts', 'credentials:"omit"', 'credentials:"include"'],
    ['src/lib/payment-api.ts', 'cache:"no-store"', 'cache:"default"'],
    ['src/lib/payment-api.ts', 'redirect:"error"', 'redirect:"follow"'],
    ['src/lib/payment-api.ts', 'body===undefined?"GET":"POST"', '"GET"'],
    ['src/lib/payment-api.ts', 'setTimeout(abort,20000)', 'setTimeout(abort,2000000)'],
    ['src/lib/payment-api.ts', 'length>131072', 'false'],
    ['src/lib/payment-api.ts', 'input.consent!==true', 'false'],
    ['src/lib/payment-api.ts', 'normalizeTikTokCustomer(input.customerasTikTokCustomer)', 'input.customer'],
    ['src/lib/payment-api.ts', '...selection,provider:input.provider,customer,consent:true,', '...selection,provider:input.provider,customer,consent:true,amount:1,'],
    ['src/lib/payment-api.ts', 'data.verified!==(data.status==="paid")', 'false'],
    ['src/lib/payment-api.ts', '"/api/orders/status",{orderToken}', '"/api/orders/status",{orderToken,customer}'],
    ['src/lib/payment-api.ts', 'data.productId!==selection.productId', 'false'],
    ['src/lib/payment-api.ts', 'data.currency!==(selection.service==="cards"?"XOF":"XAF")', 'false'],
    ['src/lib/payment-providers.ts', 'logo:"/images/leekpay.webp"', 'logo:"https://example.test/logo.png"'],
    ['src/lib/payment-providers.ts', 'flow:"redirect"', 'flow:"mobile-money"'],
    ['src/components/payment/SebPayForm.tsx', 'value={phone}', 'value={email}'],
    ['src/components/payment/SebPayForm.tsx', 'value={operator}', 'value={cardNumber}'],
    ['src/components/payment/SebPayForm.tsx', 'onSubmit={submitForm}', 'action="https://example.test"'],
    ['src/components/payment/SebPayForm.tsx', 'autoComplete="one-time-code"', 'autoComplete="current-password"'],
    ['src/components/payment/SebPayForm.tsx', 'quote.otpRequired&&!otp.trim()', 'false'],
    ['src/components/payment/SebPayForm.tsx', 'busy||submitting.current', 'busy'],
    ['src/components/payment/SharedPaymentProviders.tsx', 'onSelect={()=>onChange(provider.id)}', 'onSelect={()=>createPaymentCheckout(customer)}'],
    ['src/components/payment/SharedPaymentProviders.tsx', 'disabled={disabled||state.loading||state.error}', 'disabled={false}'],
    ['src/components/ui/dialog-providers.tsx', 'service:"cards",productId:card.id', 'service:"tiktok",productId:card.id'],
    ['src/components/ui/dialog-providers.tsx', 'requestRef.current?.abort()', 'void requestRef.current'],
    ['src/components/ui/dialog-providers.tsx', 'if(!available||requestRef.current||!selectedProvider)return', 'if(false)return'],
    ['src/components/tiktok/TikTokCheckout.tsx', 'submitting.current||!accepted||!customerValid||!validateEmail()', 'submitting.current'],
    ['src/components/tiktok/TikTokCheckout.tsx', 'manualCountry.current||manualPhone.current', 'false'],
    ['src/components/payment/PaymentResult.tsx', 'result.service!=="cards"', 'false'],
    ['src/components/payment/PaymentResult.tsx', 'result.status==="paid"&&result.verified===true', 'result.status==="paid"'],
    ['src/components/payment/PaymentResult.tsx', 'process.env.NODE_ENV==="development"', 'true'],
    ['worker/src/index.ts', 'if(!origin)thrownewApiError(403,"origin_forbidden")', 'if(false)throw new ApiError(403,"origin_forbidden")'],
    ['worker/src/shared.ts', 'request.cf?.country', 'request.headers.get("CF-IPCountry")'],
    ['worker/src/shared.ts', 'size>limit', 'false'],
    ['worker/src/shared.ts', 'if(!result.success)thrownewApiError(429,"rate_limited")', 'if(false)throw new ApiError(429,"rate_limited")'],
    ['worker/src/payments.ts', 'payload.consent!==true', 'false'],
    ['worker/src/payments.ts', 'amount:selected.amount,currency:selected.currency', 'amount:payload.amount,currency:payload.currency'],
    ['worker/src/payments.ts', 'constverified=status==="paid"', 'const verified=true'],
    ['worker/src/payments.ts', 'verified?awaitcompleteFulfillment(env,key,order):{}', 'await completeFulfillment(env,key,order)'],
    ['worker/src/payments.ts', 'order.expiresAt<=Date.now()', 'false'],
    ['worker/src/providers.ts', 'data.amount!==order.providerAmount', 'false'],
    ['worker/src/providers.ts', 'data.currency!==order.providerCurrency', 'false'],
    ['worker/src/providers.ts', 'data.transaction_id!==order.providerId', 'false'],
    ['worker/src/providers.ts', 'data.external_reference!==order.orderId', 'false'],
    ['worker/src/providers.ts', 'Authorization:`Bearer${env.LEEKPAY_SECRET_KEY}`', 'Authorization:""'],
    ['worker/src/providers.ts', '"X-Secret-Key":env.SEBPAY_SECRET_KEY', '"X-Secret-Key":""'],
    ['worker/src/providers.ts', 'redirect:"manual"', 'redirect:"follow"'],
    ['worker/src/providers.ts', 'soleaspay:{available:()=>false', 'soleaspay:{available:()=>true'],
    ['worker/src/tiktok.ts', 'awaitseal(client,order.orderId,env)', 'JSON.stringify(client)'],
    ['worker/src/tiktok.ts', 'additionalData:newTextEncoder().encode(orderId)', 'additionalData:new Uint8Array()'],
  ]
  for (const [path,before,after] of cases) {
    const changed = { ...sources, [path]: mutate(sources[path],before,after) }
    assert.ok(validateCommonPaymentArchitecture(changed).length, `Payment security must reject ${path}: ${before}`)
  }
  for (const path of ['src/lib/leekpay.ts','src/lib/tiktok-payment.ts','src/components/payment/SebPayForm.tsx']) {
    for (const extra of ['fetch("https://example.test", {body: JSON.stringify(customer)})','localStorage.setItem("draft",JSON.stringify(customer))']) {
      assert.ok(validateCommonPaymentArchitecture({...sources,[path]:`${sources[path]}\n${extra}`}).length, `Payment security must reject extra side effect in ${path}`)
    }
  }
  const api = sources['src/lib/payment-api.ts']
  const missingConsent = mutate(api,'input.consent!==true','false') + '\n// input.consent!==true'
  assert.ok(validateCommonPaymentApi(missingConsent).length, 'Comments must not satisfy a removed executable safeguard')
  console.log(`Common payment security self-test passed (${cases.length + 7} mutations).`)
}
