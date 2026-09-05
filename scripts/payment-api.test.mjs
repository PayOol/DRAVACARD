import assert from "node:assert/strict";
import { afterEach, mock, test } from "node:test";
import { PAYMENT_API_BASE, PaymentApiError, createPaymentCheckout, getPaymentProviders, getPaymentOrderStatus, getSebPayQuote } from "../src/lib/payment-api.ts";
import { PAYMENT_PROVIDERS } from "../src/lib/payment-providers.ts";
import { getTikTokOrderStatus } from "../src/lib/tiktok-payment.ts";
import { getLeekPayOrderStatus } from "../src/lib/leekpay.ts";

const token = "b".repeat(64);
const contact = {email:"shared@example.test",whatsapp:"+237600000000"};
const tiktok = {...contact,username:"shared_creator",password:"fictitious-password"};
const selections = [{service:"cards",productId:"visa-basic"},{service:"tiktok",productId:"boost"}];
const json = (value,status=200) => new Response(JSON.stringify(value),{status,headers:{"content-type":"application/json"}});
afterEach(() => mock.restoreAll());

test("each registered provider uses exactly the same checkout API for both services", async () => {
  const calls=[];
  mock.method(globalThis,"fetch",async(url,options)=>{
    const data=JSON.parse(options.body); calls.push({url,data});
    assert.equal(url,`${PAYMENT_API_BASE}/api/checkout`);
    assert.equal(options.cache,"no-store"); assert.equal(options.credentials,"omit");
    assert.equal(options.redirect,"error"); assert.equal(options.referrerPolicy,"no-referrer");
    assert.equal(data.amount,undefined); assert.equal(data.currency,undefined); assert.equal(data.customer.injected,undefined);
    return json({...data,orderToken:token,status:"pending",amount:7900,currency:data.service === "cards" ? "XOF" : "XAF",coins:700,bonus:70,
      ...(data.provider === "sebpay" ? {providerLink:"https://operator.example/approval"} : {checkoutUrl:"https://leekpay.me/checkout"})});
  });
  for (const selection of selections) for (const {id} of PAYMENT_PROVIDERS) {
    const result=await createPaymentCheckout({selection,provider:id,customer:selection.service === "cards" ? contact : tiktok,consent:true,amount:1,currency:"EUR"});
    assert.equal(result.service,selection.service); assert.equal(result.productId,selection.productId); assert.equal(result.provider,id);
    assert.equal(result.customer,undefined); assert.equal(result.consent,undefined);
  }
  assert.equal(calls.length,selections.length * PAYMENT_PROVIDERS.length);
  assert.deepEqual(calls.filter(({data})=>data.service === "cards").map(({data})=>data.customer),Array(3).fill(contact));
});

test("provider availability is global and does not depend on a requested service", async () => {
  const providers=PAYMENT_PROVIDERS.map(({id})=>({id,available:id === "leekpay"}));
  mock.method(globalThis,"fetch",async(url,options)=>{
    assert.equal(url,`${PAYMENT_API_BASE}/api/providers`); assert.equal(options.method,"GET"); assert.equal(options.body,undefined);
    return json({providers});
  });
  assert.deepEqual(await getPaymentProviders(),providers);
});

test("SebPay quotes carry a service selection for both catalogues and never a client price", async () => {
  const quote={amount:5000,fee:275,total:5275,currency:"XAF",collectionAmount:5000,otpRequired:false,ussdCode:null};
  for (const selection of selections) {
    mock.method(globalThis,"fetch",async(url,options)=>{
      assert.equal(url,`${PAYMENT_API_BASE}/api/providers/sebpay/quote`);
      assert.deepEqual(JSON.parse(options.body),{...selection,country:"CM",operator:"mtn"}); return json(quote);
    });
    assert.deepEqual(await getSebPayQuote({selection,country:"CM",operator:"mtn",amount:1}),quote);
    mock.restoreAll();
  }
});

test("checkout rejects cross-service responses and missing consent before exposing a payable URL", async () => {
  const request={selection:selections[0],provider:"leekpay",customer:contact,consent:true};
  mock.method(globalThis,"fetch",async()=>json({service:"tiktok",productId:"boost",provider:"leekpay",orderToken:token,status:"pending",amount:7900,currency:"XAF",coins:700,bonus:70,checkoutUrl:"https://leekpay.me/pay"}));
  await assert.rejects(createPaymentCheckout(request),PaymentApiError);
  mock.restoreAll();
  const spy=mock.method(globalThis,"fetch",async()=>{throw new Error("Must not request")});
  for(const invalid of [{...request,consent:false},{...request,customer:tiktok},{...request,selection:{service:"cards",productId:"boost"}},{...request,selection:{service:"tiktok",productId:"visa-basic"}}]) await assert.rejects(createPaymentCheckout(invalid),PaymentApiError);
  assert.equal(spy.mock.callCount(),0);
});

test("the neutral status API supports legacy cards and each service rejects another service's receipt", async () => {
  const card={status:"paid",verified:true,productId:"visa-basic",amount:5000,currency:"XOF"};
  mock.method(globalThis,"fetch",async()=>json(card));
  assert.deepEqual(await getPaymentOrderStatus(token),{...card,service:"cards",provider:"leekpay"});
  await assert.rejects(getTikTokOrderStatus(token),PaymentApiError);
  mock.restoreAll();
  mock.method(globalThis,"fetch",async()=>json({...card,service:"tiktok",productId:"boost",provider:"sebpay",currency:"XAF",coins:700,bonus:70,createdAt:1788600000000,orderId:"TIKTOK-TEST",notification:"sent"}));
  await assert.rejects(getLeekPayOrderStatus(token),PaymentApiError);
});

test("checkout and status reject currencies inconsistent with the service, while SebPay collection currencies remain separate", async () => {
  for (const selection of selections) {
    const response={...selection,provider:"leekpay",orderToken:token,status:"pending",verified:false,amount:5000,currency:selection.service === "cards" ? "XAF" : "XOF",checkoutUrl:"https://leekpay.me/pay",coins:700,bonus:70,createdAt:1788600000000,orderId:"ORDER-TEST",notification:"pending"};
    mock.method(globalThis,"fetch",async()=>json(response));
    await assert.rejects(createPaymentCheckout({selection,provider:"leekpay",customer:selection.service === "cards" ? contact : tiktok,consent:true}),PaymentApiError);
    await assert.rejects(getPaymentOrderStatus(token),PaymentApiError);
    mock.restoreAll();
  }
});

test("card status drops TikTok receipt identity and all contact fields", async () => {
  const card={service:"cards",productId:"visa-basic",provider:"leekpay",status:"paid",verified:true,amount:5000,currency:"XOF"};
  mock.method(globalThis,"fetch",async()=>json({...card,username:"unrelated_account",...contact,password:"must-not-escape",coins:700,bonus:70,notification:"sent"}));
  assert.deepEqual(await getPaymentOrderStatus(token),card);
});

test("TikTok credentials containing control characters are rejected before any payment request", async () => {
  const spy=mock.method(globalThis,"fetch",async()=>{throw new Error("Must not request")});
  for(const password of ["bad\npassword","bad\u007fpassword"]) {
    await assert.rejects(createPaymentCheckout({selection:selections[1],provider:"leekpay",customer:{...tiktok,password},consent:true}),PaymentApiError);
  }
  assert.equal(spy.mock.callCount(),0);
});

test("service preparation failures remain distinct from provider availability without leaking backend data", async () => {
  const request={selection:selections[1],provider:"leekpay",customer:tiktok,consent:true};
  mock.method(globalThis,"fetch",async()=>json({error:{code:"service_not_ready",password:tiktok.password,message:"private backend details"}},503));
  await assert.rejects(createPaymentCheckout(request),error=>error.code === "service_not_ready" && !JSON.stringify(error).includes(tiktok.password) && !error.message.includes("private"));
});
