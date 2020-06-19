# Integration Guide

The following diagram shows whole checkout flow supported with [Adyen Web Components](https://docs.adyen.com/checkout/components-web).

![Flow](https://user-images.githubusercontent.com/3469524/85017686-3317bf00-b16c-11ea-8840-f34b97ac3dcb.jpeg)

In your backend, ensure the steps below are done:
1. On each checkout step [validate cart state](#validate-cart-state)
1. Before starting payment process make sure there is no valid payments already:
    * [Recalculate cart](#recalculate-cart)
    * [Validate payment](#validate-payment)
    * [Validate payment transaction](#validate-payment-transaction)

If all above validations are passed then order can be created right away and order confirmation page shown.
Otherwise, shopper might continue with further payment steps.

1. From your server, submit a request to [get a list of payment methods available to the shopper](#step-1-get-available-payment-methods).
2. [Add the specific payment method Component](#step-2-add-components-to-your-payments-form) to your payments form.

## Step 1: Get available payment methods
When your shopper is ready to pay, get a list of the available payment methods based on their country, device, and the payment amount.

From the merchant server, [Create/Update CTP payment](https://docs.commercetools.com/http-api-projects-payments#create-a-payment) with `getPaymentMethodsRequest` custom field.  

Set `getPaymentMethodsRequest` custom field for a shopper in the Germany, for a payment of `10 EUR`: 

``` json
{
  "countryCode": "DE",
  "shopperLocale": "de-DE",
  "amount": {
    "currency": "EUR",
    "value": 1000
  }
}
```

CTP payment representation:

``` json
{
  "custom": {
    "type": {
      "typeId": "type",
      "key": "ctp-adyen-integration-web-components-payment-type"
    },
    "fields": {
      "getPaymentMethodsRequest": "{\"countryCode\":\"DE\",\"shopperLocale\":\"de-DE\",\"amount\":{\"currency\":\"EUR\",\"value\":1000}}"
    }
  }
}
```

The response includes the list of available paymentMethods:

``` json
{
 "paymentMethods":[
  {
    "name":"Credit Card",
    "type":"scheme"
  },
  {
    "name":"SEPA Direct Debit",
    "type":"sepadirectdebit"
  },
 ]
}
```

CTP payment representation:

``` json
{
  "custom": {
    "type": {
      "typeId": "type",
      "key": "ctp-adyen-integration-web-components-payment-type"
    },
    "fields": {
      "getPaymentMethodsRequest": "{\"countryCode\":\"DE\",\"shopperLocale\":\"de-DE\",\"amount\":{\"currency\":\"EUR\",\"value\":1000}}",
      "getPaymentMethodsResponse": "{\"groups\":[{\"name\":\"Gift Card\",\"types\":[\"givex\",\"svs\"]},{\"name\":\"Credit Card\",\"types\":[\"visa\",\"mc\",\"amex\",\"maestro\",\"uatp\",\"cup\",\"diners\",\"discover\",\"hipercard\",\"jcb\"]}],\"paymentMethods\":[{\"name\":\"PayPal\",\"supportsRecurring\":true,\"type\":\"paypal\"},{\"brands\":[\"visa\",\"mc\",\"amex\",\"maestro\",\"uatp\",\"cup\",\"diners\",\"discover\",\"hipercard\",\"jcb\"],\"details\":[{\"key\":\"encryptedCardNumber\",\"type\":\"cardToken\"},{\"key\":\"encryptedSecurityCode\",\"type\":\"cardToken\"},{\"key\":\"encryptedExpiryMonth\",\"type\":\"cardToken\"},{\"key\":\"encryptedExpiryYear\",\"type\":\"cardToken\"},{\"key\":\"holderName\",\"optional\":true,\"type\":\"text\"}],\"name\":\"Kreditkarte\",\"type\":\"scheme\"},{\"name\":\"Sofort.\",\"supportsRecurring\":true,\"type\":\"directEbanking\"},{\"details\":[{\"key\":\"sepa.ownerName\",\"type\":\"text\"},{\"key\":\"sepa.ibanNumber\",\"type\":\"text\"}],\"name\":\"SEPA Lastschrift\",\"supportsRecurring\":true,\"type\":\"sepadirectdebit\"},{\"name\":\"Rechnung mit Klarna.\",\"supportsRecurring\":true,\"type\":\"klarna\"},{\"details\":[{\"key\":\"bic\",\"optional\":true,\"type\":\"text\"}],\"name\":\"GiroPay\",\"supportsRecurring\":true,\"type\":\"giropay\"},{\"name\":\"Ratenkauf mit Klarna.\",\"supportsRecurring\":true,\"type\":\"klarna_account\"},{\"details\":[{\"key\":\"encryptedCardNumber\",\"type\":\"cardToken\"},{\"key\":\"encryptedSecurityCode\",\"type\":\"cardToken\"},{\"key\":\"encryptedExpiryMonth\",\"type\":\"cardToken\"},{\"key\":\"encryptedExpiryYear\",\"type\":\"cardToken\"},{\"key\":\"holderName\",\"optional\":true,\"type\":\"text\"},{\"key\":\"telephoneNumber\",\"optional\":true,\"type\":\"text\"}],\"name\":\"ExpressPay\",\"supportsRecurring\":true,\"type\":\"cup\"},{\"details\":[{\"key\":\"encryptedCardNumber\",\"type\":\"cardToken\"},{\"key\":\"encryptedSecurityCode\",\"optional\":true,\"type\":\"cardToken\"},{\"key\":\"encryptedExpiryMonth\",\"optional\":true,\"type\":\"cardToken\"},{\"key\":\"encryptedExpiryYear\",\"optional\":true,\"type\":\"cardToken\"},{\"key\":\"encryptedPassword\",\"optional\":true,\"type\":\"cardToken\"},{\"key\":\"holderName\",\"optional\":true,\"type\":\"text\"}],\"name\":\"Givex\",\"supportsRecurring\":true,\"type\":\"givex\"},{\"name\":\"Pay now with Klarna.\",\"supportsRecurring\":true,\"type\":\"klarna_paynow\"},{\"details\":[{\"key\":\"encryptedCardNumber\",\"type\":\"cardToken\"},{\"key\":\"encryptedSecurityCode\",\"optional\":true,\"type\":\"cardToken\"},{\"key\":\"encryptedExpiryMonth\",\"optional\":true,\"type\":\"cardToken\"},{\"key\":\"encryptedExpiryYear\",\"optional\":true,\"type\":\"cardToken\"},{\"key\":\"encryptedPassword\",\"optional\":true,\"type\":\"cardToken\"},{\"key\":\"holderName\",\"optional\":true,\"type\":\"text\"}],\"name\":\"SVS\",\"supportsRecurring\":true,\"type\":\"svs\"}]}"
    }
  }
}

```

Pass the `getPaymentMethodsResponse` to your front end. You might use this in the next step to show which payment methods are available for the shopper.

## Step 2: Add Components to your payments form

Next, use the `Component` to render the payment method, and collect the required payment details from your shopper.

If you haven't created the payment forms already in your frontend, follow the official [Web Components integration guide](https://docs.adyen.com/checkout/components-web#step-2-add-components) from Adyen.

An `origin key` is a client-side key that is used to validate Adyen's JavaScript component library. It is required to render Component.

To be able to get the origin key extension module could be used, from the merchant server, [Update CTP payment](https://docs.commercetools.com/http-api-projects-payments#update-payment) with `getPaymentMethodsRequest` custom field.

An [update action](https://docs.commercetools.com/http-api-projects-payments#set-customfield) to set `getOriginKeysRequest` custom field.
```
{
  "version": "PAYMENT_VERSION",
  "actions": [  
    {
      "action": "setCustomField",
      "name": "getOriginKeysRequest",
      "value": "{\"originDomains\":[\"https://www.your-company1.com\",\"https://www.your-company2.com\"]}"
    }
  ]
}
```

The response contains a list of origin key for all requested domains. For each list item, the key is the domain, and the value is its associated origin key.

``` json
{
 "originKeys":{
    "https://www.your-company1.com":"pub.v2.99...",
    "https://www.your-company2.com":"pub.v2.99...",
 }
}
```

CTP payment representation:

``` json
{
  "custom": {
    "type": {
      "typeId": "type",
      "key": "ctp-adyen-integration-web-components-payment-type"
    },
    "fields": {
      "getOriginKeysRequest": "{\"originDomains\":[\"https://www.your-company1.com\",\"https://www.your-company2.com\"]}",
      "getOriginKeysResponse": "{\"originKeys\":{\"https://www.your-company1.com\":\"pub.v2.99...\",\"https://www.your-company2.com\":\"pub.v2.99...\"}}"
    }
  }
}
```

Pass the `origin key` to your front end. You might use this origin key to be able to render Component.

> Note: First 2 steps are optional if origin key and payment methods has been already cached by the merchant server.
 
## Step 3: Make a payment
After the shopper submits their payment details or chooses to pay with a payment method that requires a redirection,
the Adyen Web Components will generate a `makePaymentRequest`. Consult [Adyen documentation](https://docs.adyen.com/api-explorer/#/PaymentSetupAndVerificationService/payments) to see which parameters 
are necessary for the current payment request.

[Update CTP payment](https://docs.commercetools.com/http-api-projects-payments#update-payment) with `makePaymentRequest` custom field. 
```json
{
  "version": "PAYMENT_VERSION",
  "actions": [
    {
      "action": "setCustomField",
      "name": "makePaymentRequest",
      "value": "{\"riskData\":{\"clientData\":\"xxx\"},\"paymentMethod\":{\"type\":\"scheme\",\"holderName\":\"Lam Tran\",\"encryptedCardNumber\":\"adyenjs_...\",\"encryptedExpiryMonth\":\"adyenjs_...\",\"encryptedExpiryYear\":\"adyenjs_...\",\"encryptedSecurityCode\":\"adyenjs_...\"},\"billingAddress\":{\"street\":\"Test Strasse\",\"houseNumberOrName\":\"10\",\"postalCode\":\"80000\",\"city\":\"Munich\",\"stateOrProvince\":\"Bayern\",\"country\":\"DE\"},\"browserInfo\":{\"acceptHeader\":\"*/*\",\"colorDepth\":24,\"language\":\"en-US\",\"javaEnabled\":false,\"screenHeight\":1050,\"screenWidth\":1680,\"userAgent\":\"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.4044.129 Safari/537.36\",\"timeZoneOffset\":-120},\"reference\":773,\"amount\":{\"currency\":\"EUR\",\"value\":1000}}"
    }
  ]
}
```
The response from Adyen is be added to `makePaymentResponse` custom field. 
The response contains information for the next steps of the payment process.
For details, consult the [Adyen documentation](https://docs.adyen.com/checkout/components-web#step-3-make-a-payment)

A CTP payment with `makePaymentResponse` for the case where user has to be redirected to a payment provider page for further authentication:
```json
{
  "custom": {
    "type": {
      "typeId": "type",
      "key": "ctp-adyen-integration-web-components-payment-type"
    },
    "fields": {
      "makePaymentRequest": "{\"riskData\":{\"clientData\":\"xxx\"},\"paymentMethod\":{\"type\":\"scheme\",\"holderName\":\"Lam Tran\",\"encryptedCardNumber\":\"adyenjs_...\",\"encryptedExpiryMonth\":\"adyenjs_...\",\"encryptedExpiryYear\":\"adyenjs_...\",\"encryptedSecurityCode\":\"adyenjs_...\"},\"billingAddress\":{\"street\":\"Test Strasse\",\"houseNumberOrName\":\"10\",\"postalCode\":\"80000\",\"city\":\"Munich\",\"stateOrProvince\":\"Bayern\",\"country\":\"DE\"},\"browserInfo\":{\"acceptHeader\":\"*/*\",\"colorDepth\":24,\"language\":\"en-US\",\"javaEnabled\":false,\"screenHeight\":1050,\"screenWidth\":1680,\"userAgent\":\"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.4044.129 Safari/537.36\",\"timeZoneOffset\":-120},\"reference\":773,\"amount\":{\"currency\":\"EUR\",\"value\":1000}}",
      "makePaymentResponse": "{\"resultCode\":\"RedirectShopper\",\"action\":{\"paymentData\":\"xxx\",\"paymentMethodType\":\"scheme\",\"url\":\"https://test.adyen.com/hpp/3d/validate.shtml\",\"data\":{\"MD\":\"yyy\",\"PaReq\":\"zzz\",\"TermUrl\":\"https://9944328d3d5e.ngrok.io/return-url\"},\"method\":\"POST\",\"type\":\"redirect\"},\"details\":[{\"key\":\"MD\",\"type\":\"text\"},{\"key\":\"PaRes\",\"type\":\"text\"}],\"paymentData\":\"xxx\",\"redirect\":{\"data\":{\"PaReq\":\"zzz\",\"TermUrl\":\"https://9944328d3d5e.ngrok.io/return-url\",\"MD\":\"yyy\"},\"method\":\"POST\",\"url\":\"https://test.adyen.com/hpp/3d/validate.shtml\"}}"
    }
  }
}
```    

A CTP payment with `makePaymentResponse` for the case where there is no further steps needed:
```json
{
  "custom": {
    "type": {
      "typeId": "type",
      "key": "ctp-adyen-integration-web-components-payment-type"
    },
    "fields": {
      "makePaymentRequest": "{\"riskData\":{\"clientData\":\"xxx\"},\"paymentMethod\":{\"type\":\"scheme\",\"encryptedCardNumber\":\"adyenjs_...\",\"encryptedExpiryMonth\":\"adyenjs_...\",\"encryptedExpiryYear\":\"adyenjs_...\",\"encryptedSecurityCode\":\"adyenjs_...\"},\"browserInfo\":{\"acceptHeader\":\"*/*\",\"colorDepth\":30,\"language\":\"en-US\",\"javaEnabled\":false,\"screenHeight\":1050,\"screenWidth\":1680,\"userAgent\":\"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_4) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/83.0.4103.0 Safari/537.36\",\"timeZoneOffset\":-120},\"reference\":233,\"amount\":{\"currency\":\"EUR\",\"value\":1000},\"channel\":\"Web\",\"origin\":\"https://6ca7e0942afd.ngrok.io\",\"returnUrl\":\"https://6ca7e0942afd.ngrok.io/return-url\"}",
      "makePaymentResponse": "{\"pspReference\":\"852592493977365C\",\"resultCode\":\"Authorised\",\"amount\":{\"currency\":\"EUR\",\"value\":1000},\"merchantReference\":\"233\"}"
    }
  }
}
```

#### Klarna payment
For Klarna payment it is necessary to provide [line item details](https://docs.adyen.com/api-explorer/#/PaymentSetupAndVerificationService/latest/payments__reqParam_lineItems) with `makePaymentRequest`.
Extension module can add the line item details for you if [the payment is added to a cart](https://docs.commercetools.com/http-api-projects-carts#add-payment).

[Update CTP payment](https://docs.commercetools.com/http-api-projects-payments#update-payment) with `makePaymentRequest` custom field **WITHOUT** `lineItems` attribute. 
```json
{
  "version": "PAYMENT_VERSION",
  "actions": [
    {
      "action": "setCustomField",
      "name": "makePaymentRequest",
      "value": "{\"riskData\":{\"clientData\":\"xxx\"},\"reference\":\"Klarna Pay later\",\"paymentMethod\":{\"type\":\"klarna\"},\"amount\":{\"currency\":\"EUR\",\"value\":1000},\"shopperLocale\":\"de_DE\",\"countryCode\":\"DE\",\"shopperEmail\":\"youremail@email.com\",\"shopperReference\":\"YOUR_UNIQUE_SHOPPER_ID\",\"returnUrl\":\"https://www.yourshop.com/checkout/result\"}"
    }
  ]
}
```

Extension module will add line items to your `makePaymentRequest`
```json
{
  "riskData": {
    "clientData": "xxx"
  },
  "reference": "Klarna Pay later",
  "paymentMethod": {
    "type": "klarna"
  },
  "amount": {
    "currency": "EUR",
    "value": 1000
  },
  "shopperLocale": "de_DE",
  "countryCode": "DE",
  "shopperEmail": "youremail@email.com",
  "shopperReference": "YOUR_UNIQUE_SHOPPER_ID",
  "returnUrl": "https://www.yourshop.com/checkout/result",
  "lineItems": [
    {
      "id": "test-product-sku-1",
      "quantity": 2,
      "description": "item",
      "amountIncludingTax": 1000,
      "taxPercentage": 1900
    },
    {
      "id": "0a293870-ae74-48a3-a747-3d4d321c38eb",
      "quantity": 1,
      "description": "testCustomLineItem",
      "amountIncludingTax": 4200,
      "taxPercentage": 1900
    },
    {
      "id": "ABHOLUNG",
      "quantity": 1,
      "description": "Abholung beim Fachhändler (kostenlos)",
      "amountIncludingTax": 3000,
      "taxPercentage": 1900
    }
  ],
  "merchantAccount": "YourMerchantAccount"
}
```
If `makePaymentRequest` has `lineItems` attribute, extension module will not overwrite those `lineItems`.

## Step 4: Submit additional payment details
If the shopper performed additional action in the previous step,
you need to make `submitAdditionalPaymentRequest` to either complete the payment, or to check the payment result.

Collect information from the previous step and [update CTP payment](https://docs.commercetools.com/http-api-projects-payments#update-payment) with `submitAdditionalPaymentRequest` custom field.
The information is available either in `state.data.details` from the `onAdditionalDetails` event or, for redirects, the parameters you received when the shopper was redirected back to your website.
```json
{
  "version": "PAYMENT_VERSION",
  "actions": [
    {
      "action": "submitAdditionalPaymentRequest",
      "name": "makePaymentRequest",
      "value": "{\"details\":{\"redirectResult\":\"Ab02b4c0!...\"}}"
    }
  ]
}
```

Extension module will extend `submitAdditionalPaymentRequest` with `paymentData` attribute if the attribute is missing.
In this case, `paymentData` will be added from the previous `makePaymentRequest`.

After update, you will receive `submitAdditionalPaymentResponse` in the returned CTP payment.
The next steps depend on if you received an action object in the `submitAdditionalPaymentResponse`.

If you received an action object, [pass the action object to your front end](https://docs.adyen.com/checkout/components-web/#step-4-additional-front-end) and perform Step 4 again.
```json
{
  "custom": {
    "type": {
      "typeId": "type",
      "key": "ctp-adyen-integration-web-components-payment-type"
    },
    "fields": {
      "submitPaymentDetailsRequest": "{\"details\":{\"redirectResult\":\"Ab02b4c0!...\"}}",
      "submitAdditionalPaymentDetailsResponse": "{\"resultCode\":\"ChallengeShopper\",\"action\":{\"paymentData\":\"Ab02b4c0!...\",\"paymentMethodType\":\"scheme\",\"token\":\"eyJhY3...\",\"type\":\"threeDS2Challenge\"},\"authentication\":{\"threeds2.challengeToken\":\"eyJhY3...\"},\"details\":[{\"key\":\"threeds2.challengeResult\",\"type\":\"text\"}],\"paymentData\":\"Ab02b4c0!...\"}"
    }
  }
}
```

If you did not get an action object, you can present the payment result to your shopper. 
See [Adyen documentation](https://docs.adyen.com/checkout/components-web#step-6-present-payment-result) for more information how to present the results. 
```json
{
  "custom": {
    "type": {
      "typeId": "type",
      "key": "ctp-adyen-integration-web-components-payment-type"
    },
    "fields": {
      "submitPaymentDetailsRequest": "{\"details\":{\"redirectResult\":\"Ab02b4c0!...\"}}",
      "submitAdditionalPaymentDetailsResponse": "{\"pspReference\":\"882592549876090E\",\"resultCode\":\"Authorised\",\"amount\":{\"currency\":\"EUR\",\"value\":1000},\"merchantReference\":\"23\"}"
    }
  }
}
```
