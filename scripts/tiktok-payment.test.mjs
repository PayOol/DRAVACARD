import assert from "node:assert/strict";
import { afterEach, mock, test } from "node:test";
import { PaymentApiError } from "../src/lib/leekpay.ts";
import { createTikTokCheckout, getTikTokOrderStatus, getTikTokProviders, getTikTokSebPayCountries, getTikTokSebPayQuote, normalizeTikTokCustomer, safeTikTokPaymentUrl } from "../src/lib/tiktok-payment.ts";

const token = "a".repeat(64);
const customer = { username: "@demo_creator", password: "fictitious-test", email: "demo@example.com", whatsapp: "+237600000000" };
const request = { packId: "boost", provider: "leekpay", customer, consent: true };
const checkout = { service:"tiktok",productId:"boost", orderToken: token, provider: "leekpay", status: "pending", checkoutUrl: "https://leekpay.me/pay_test", amount: 7900, currency: "XAF", coins: 700, bonus: 70 };
const order = { provider: "leekpay", packId: "boost", status: "paid", verified: true, coins: 700, bonus: 70, amount: 7900, currency: "XAF", createdAt: 1788600000000, orderId: "TIKTOK-TEST", notification: "sent" };
const wireOrder = {...order,service:"tiktok",productId:"boost"};
const country = { id: "cm", code: "CM", name: "Cameroun", prefix: "237", currency: "XAF", exchangeRate: 1, operators: [{ id: "orange", code: "orange", name: "Orange Money", otpRequired: true, ussdCode: "#144*montant#" }] };
const quote = { amount: 7900, fee: 201, total: 8101, currency: "XAF", collectionAmount: 8101, otpRequired: true, ussdCode: "#144*8101#" };
const json = (value, status=200, headers={}) => new Response(JSON.stringify(value), {status, headers:{"content-type":"application/json", ...headers}});
afterEach(() => mock.restoreAll());

test("normalizes TikTok identifiers and validates all delivery fields", () => {
  assert.deepEqual(normalizeTikTokCustomer(customer), {...customer, username:"demo_creator"});
  for (const invalid of [{...customer, username:"x"}, {...customer,password:"123"}, {...customer,username:"a\nb"}, {...customer,email:"wrong"}, {...customer,whatsapp:"123"}]) assert.equal(normalizeTikTokCustomer(invalid), null);
});
test("checkout sends selection and consent without trusting a client-supplied amount", async () => {
  let calls=0;
  mock.method(globalThis, "fetch", async (url, options) => {
    calls++;
    assert.match(url,/\/api\/checkout$/);
    assert.equal(options.cache,"no-store"); assert.equal(options.credentials,"omit"); assert.equal(options.redirect,"error"); assert.equal(options.referrerPolicy,"no-referrer");
    const body=JSON.parse(options.body);
    assert.deepEqual(body,{service:"tiktok",productId:"boost", provider:"leekpay", customer:{...customer,username:"demo_creator"},consent:true});
    return json(checkout,201);
  });
  assert.equal((await createTikTokCheckout({...request,amount:1})).orderToken,token);
  assert.equal(calls,1);
});
test("blocks missing consent and invalid custom quantities before a request", async () => {
  const spy=mock.method(globalThis,"fetch", async()=>json(checkout));
  for(const invalid of [{...request,consent:false},{...request,customer:{...customer,password:""}},...[-1,0,69,1000001,NaN].map(customCoins=>({...request,packId:"custom",customCoins}))]) await assert.rejects(createTikTokCheckout(invalid),PaymentApiError);
  assert.equal(spy.mock.callCount(),0);
});
test("custom orders send quantity only and ignore unknown object keys", async () => {
  mock.method(globalThis,"fetch",async(_,options)=>{const value=JSON.parse(options.body);assert.equal(value.customCoins,100);assert.equal(value.amount,undefined);assert.equal(value.customer.secret,undefined);return json({...checkout,productId:"custom"});});
  await createTikTokCheckout({...request,packId:"custom",customCoins:100,customer:{...customer,secret:"ignore"}});
});
test("rejects insecure checkout redirects and mismatched provider responses", async () => {
  for(const value of ["javascript:alert(1)","http://leekpay.me/pay", "https://user:password@leekpay.me/pay","https://leekpay.me:444/pay"]) assert.equal(safeTikTokPaymentUrl(value),false);
  for(const response of [{...checkout,checkoutUrl:"javascript:alert(1)"},{...checkout,provider:"sebpay"},{...checkout,orderToken:"fake"},{...checkout,status:"paid"}]) {
    mock.method(globalThis,"fetch",async()=>json(response.orderId ? {...wireOrder,...response} : response)); await assert.rejects(createTikTokCheckout(request),PaymentApiError); mock.restoreAll();
  }
});
test("status uses POST token and returns only the public receipt allowlist", async () => {
  mock.method(globalThis,"fetch",async(url,options)=>{assert.match(url,/\/orders\/status$/);assert.deepEqual(JSON.parse(options.body),{orderToken:token});assert.equal(options.cache,"no-store");return json({...wireOrder,password:"must not escape",email:"private@example.com",orderToken:token});});
  assert.deepEqual(await getTikTokOrderStatus(token),order);
});
test("never accepts an unverified success or a forged verified pending order", async () => {
  for(const response of [{...order,verified:false},{...order,status:"pending"},{...order,status:"success"},{...order,amount:-1},{...order,coins:0},{...order,bonus:-1},{...order,createdAt:Infinity}]) {
    mock.method(globalThis,"fetch",async()=>json(response.orderId ? {...wireOrder,...response} : response));await assert.rejects(getTikTokOrderStatus(token),PaymentApiError);mock.restoreAll();
  }
});
test("verified receipts accept bounded account and transaction details without exposing other customer data", async () => {
  const metadata = { username: "creator_" + "x".repeat(246), transactionReference: "r".repeat(129) };
  mock.method(globalThis,"fetch",async()=>json({...wireOrder,...metadata,password:customer.password,email:customer.email,whatsapp:customer.whatsapp}));
  assert.deepEqual(await getTikTokOrderStatus(token), {...order,...metadata});
  for (const invalid of [{username:"x".repeat(255)}, {username:"\nprivate"}, {username:"   "}, {username:null}, {transactionReference:"r".repeat(130)}, {transactionReference:"ref\u007f"}]) {
    mock.restoreAll();
    mock.method(globalThis,"fetch",async()=>json({...wireOrder,...invalid}));
    await assert.rejects(getTikTokOrderStatus(token),PaymentApiError);
  }
});
test("pending and failed responses cannot reveal receipt-only identity or transaction details", async () => {
  for (const status of ["pending","processing","failed","cancelled","expired"]) {
    const expected={...order,status,verified:false};
    mock.method(globalThis,"fetch",async()=>json({...expected,service:"tiktok",productId:"boost",username:"private-user",transactionReference:"private-ref"}));
    assert.deepEqual(await getTikTokOrderStatus(token),expected);
    mock.restoreAll();
  }
});
test("missing and malformed references never reach the server",async()=>{
  const spy=mock.method(globalThis,"fetch",async()=>json(wireOrder));
  for(const value of ["", "#order="+token,"success", "b".repeat(63)]) await assert.rejects(getTikTokOrderStatus(value),PaymentApiError);
  assert.equal(spy.mock.callCount(),0);
});
test("providers retain all three choices including unavailable services",async()=>{
  const providers=[{id:"leekpay",available:true},{id:"soleaspay",available:false},{id:"sebpay",available:true}];
  mock.method(globalThis,"fetch",async()=>json({providers}));assert.deepEqual(await getTikTokProviders(),providers);
});
test("malformed or duplicate provider catalogues fail closed",async()=>{
  mock.method(globalThis,"fetch",async()=>json({providers:Array(3).fill({id:"leekpay",available:true})}));await assert.rejects(getTikTokProviders(),PaymentApiError);
});
test("SebPay exposes server countries and exact quoted OTP totals",async()=>{
  mock.method(globalThis,"fetch",async(url,options)=>{
    if(url.endsWith("countries"))return json({countries:[country]});
    assert.deepEqual(JSON.parse(options.body),{service:"tiktok",productId:"boost",country:"CM",operator:"orange"});return json(quote);
  });
  assert.deepEqual(await getTikTokSebPayCountries(),[country]);
  assert.deepEqual(await getTikTokSebPayQuote({packId:"boost",country:"CM",operator:"orange"}),quote);
});
test("SebPay rejects inconsistent fees and invalid country prefixes",async()=>{
  mock.method(globalThis,"fetch",async()=>json({...quote,total:7900}));await assert.rejects(getTikTokSebPayQuote({packId:"boost",country:"CM",operator:"orange"}),PaymentApiError);
  mock.restoreAll();mock.method(globalThis,"fetch",async()=>json({countries:[{...country,prefix:"javascript:"}]}));await assert.rejects(getTikTokSebPayCountries(),PaymentApiError);
});
test("SebPay collection sends OTP only in POST body and accepts pending response",async()=>{
  const payment={country:"CM",operator:"orange",phone:"237600000000",otpCode:"123456"};
  mock.method(globalThis,"fetch",async(url,options)=>{assert.equal(url.includes("123456"),false);assert.deepEqual(JSON.parse(options.body).payment,payment);return json({...checkout,provider:"sebpay",checkoutUrl:undefined,providerLink:"https://operator.example/approve"});});
  assert.equal((await createTikTokCheckout({...request,provider:"sebpay",payment})).status,"pending");
});
test("HTTP failure respects Retry-After without retrying a charge",async()=>{
  const spy=mock.method(globalThis,"fetch",async()=>json({error:{code:"unavailable"}},429,{"retry-after":"8"}));
  await assert.rejects(createTikTokCheckout(request),error=>error instanceof PaymentApiError && error.retryable && error.retryAfterMs===8000);
  assert.equal(spy.mock.callCount(),1);
});
test("rejects non-JSON and oversized provider responses",async()=>{
  mock.method(globalThis,"fetch",async()=>new Response("<html>Offline</html>",{headers:{"content-type":"text/html"}}));await assert.rejects(getTikTokProviders(),PaymentApiError);
  mock.restoreAll();mock.method(globalThis,"fetch",async()=>json({padding:"a".repeat(131073)}));await assert.rejects(getTikTokProviders(),PaymentApiError);
});
