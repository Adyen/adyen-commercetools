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

```
{
 "paymentMethods":[
  {
    "details":[...],
    "name":"Credit Card",
    "type":"scheme"
    ...
  },
  {
    "details":[...],
    "name":"SEPA Direct Debit",
    "type":"sepadirectdebit"
  },
  ...
  ]
}
```

CTP payment representation:

```
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
 
