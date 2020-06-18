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
  "amountPlanned": {
    "type": "centPrecision",
    "currencyCode": "EUR",
    "centAmount": 1000,
    "fractionDigits": 2
  },
  "paymentMethodInfo": {
    "paymentInterface": "ctp-adyen-integration"
  },
  "custom": {
    "type": {
      "typeId": "type",
      "id": "0b13d81c-e54e-4eda-8c91-8abff3207206"
    },
    "fields": {
      "getOriginKeysRequest": "{\"originDomains\":[\"https://www.your-company1.com\",\"https://www.your-company2.com\"]}",
      "getOriginKeysResponse": "{\"originKeys\":{\"https://www.your-company1.com\":\"pub.v2.99...\",\"https://www.your-company2.com\":\"pub.v2.99...\"}}"
    }
  },
  "interfaceInteractions": [
    {
      "type": {
        "typeId": "type",
        "id": "1c4f24de-156a-4c0e-9058-92e8dd25c39a"
      },
      "fields": {
        "createdAt": "2020-06-18T11:15:30.657Z",
        "response": "{\"originKeys\":{\"https://www.your-company1.com\":\"pub.v2.99...\",\"https://www.your-company2.com\":\"pub.v2.99...\"}}",
        "request": "{\"originDomains\":[\"https://www.your-company1.com\",\"https://www.your-company2.com\"],\"merchantAccount\":\"YOUR_MERCHANT_ACCOUNT\"}",
        "type": "getOriginKeys"
      }
    }
  ]
}
```

Pass the `origin key` to your front end.
