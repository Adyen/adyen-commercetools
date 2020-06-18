## Step 1: Get available payment methods
When your shopper is ready to pay, get a list of the available payment methods based on their country, device, and the payment amount.

From the merchant server, [Create/Update CTP payment](https://docs.commercetools.com/http-api-projects-payments#create-a-payment) with `getPaymentMethodsRequest` custom field.  

### Request

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
  "amountPlanned": {
    "currencyCode": "EUR",
    "centAmount": 1000
  },
  "paymentMethodInfo": {
    "paymentInterface": "ctp-adyen-integration"
  },
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

### Response

Pass the `getPaymentMethodsResponse` to your front end. You might use this in the next step to show which payment methods are available for the shopper.

The response includes the list of available paymentMethods:

``` json
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
      "id": "1601429b-a96e-40cc-98c4-8c39e5931947"
    },
    "fields": {
      "getPaymentMethodsRequest": "{\"countryCode\":\"DE\",\"shopperLocale\":\"de-DE\",\"amount\":{\"currency\":\"EUR\",\"value\":1000}}",
      "getPaymentMethodsResponse": "{\"groups\":[{\"name\":\"Gift Card\",\"types\":[\"givex\",\"svs\"]},{\"name\":\"Credit Card\",\"types\":[\"visa\",\"mc\",\"amex\",\"maestro\",\"uatp\",\"cup\",\"diners\",\"discover\",\"hipercard\",\"jcb\"]}],\"paymentMethods\":[{\"name\":\"PayPal\",\"supportsRecurring\":true,\"type\":\"paypal\"},{\"brands\":[\"visa\",\"mc\",\"amex\",\"maestro\",\"uatp\",\"cup\",\"diners\",\"discover\",\"hipercard\",\"jcb\"],\"details\":[{\"key\":\"encryptedCardNumber\",\"type\":\"cardToken\"},{\"key\":\"encryptedSecurityCode\",\"type\":\"cardToken\"},{\"key\":\"encryptedExpiryMonth\",\"type\":\"cardToken\"},{\"key\":\"encryptedExpiryYear\",\"type\":\"cardToken\"},{\"key\":\"holderName\",\"optional\":true,\"type\":\"text\"}],\"name\":\"Kreditkarte\",\"type\":\"scheme\"},{\"name\":\"Sofort.\",\"supportsRecurring\":true,\"type\":\"directEbanking\"},{\"details\":[{\"key\":\"sepa.ownerName\",\"type\":\"text\"},{\"key\":\"sepa.ibanNumber\",\"type\":\"text\"}],\"name\":\"SEPA Lastschrift\",\"supportsRecurring\":true,\"type\":\"sepadirectdebit\"},{\"name\":\"Rechnung mit Klarna.\",\"supportsRecurring\":true,\"type\":\"klarna\"},{\"details\":[{\"key\":\"bic\",\"optional\":true,\"type\":\"text\"}],\"name\":\"GiroPay\",\"supportsRecurring\":true,\"type\":\"giropay\"},{\"name\":\"Ratenkauf mit Klarna.\",\"supportsRecurring\":true,\"type\":\"klarna_account\"},{\"details\":[{\"key\":\"encryptedCardNumber\",\"type\":\"cardToken\"},{\"key\":\"encryptedSecurityCode\",\"type\":\"cardToken\"},{\"key\":\"encryptedExpiryMonth\",\"type\":\"cardToken\"},{\"key\":\"encryptedExpiryYear\",\"type\":\"cardToken\"},{\"key\":\"holderName\",\"optional\":true,\"type\":\"text\"},{\"key\":\"telephoneNumber\",\"optional\":true,\"type\":\"text\"}],\"name\":\"ExpressPay\",\"supportsRecurring\":true,\"type\":\"cup\"},{\"details\":[{\"key\":\"encryptedCardNumber\",\"type\":\"cardToken\"},{\"key\":\"encryptedSecurityCode\",\"optional\":true,\"type\":\"cardToken\"},{\"key\":\"encryptedExpiryMonth\",\"optional\":true,\"type\":\"cardToken\"},{\"key\":\"encryptedExpiryYear\",\"optional\":true,\"type\":\"cardToken\"},{\"key\":\"encryptedPassword\",\"optional\":true,\"type\":\"cardToken\"},{\"key\":\"holderName\",\"optional\":true,\"type\":\"text\"}],\"name\":\"Givex\",\"supportsRecurring\":true,\"type\":\"givex\"},{\"name\":\"Pay now with Klarna.\",\"supportsRecurring\":true,\"type\":\"klarna_paynow\"},{\"details\":[{\"key\":\"encryptedCardNumber\",\"type\":\"cardToken\"},{\"key\":\"encryptedSecurityCode\",\"optional\":true,\"type\":\"cardToken\"},{\"key\":\"encryptedExpiryMonth\",\"optional\":true,\"type\":\"cardToken\"},{\"key\":\"encryptedExpiryYear\",\"optional\":true,\"type\":\"cardToken\"},{\"key\":\"encryptedPassword\",\"optional\":true,\"type\":\"cardToken\"},{\"key\":\"holderName\",\"optional\":true,\"type\":\"text\"}],\"name\":\"SVS\",\"supportsRecurring\":true,\"type\":\"svs\"}]}"
    }
  },
  "interfaceInteractions": [
    {
      "type": {
        "typeId": "type",
        "id": "4f7debe2-1392-49e3-9049-32af85b4c8e9"
      },
      "fields": {
        "createdAt": "2020-06-18T11:49:04.954Z",
        "response": "{\"groups\":[{\"name\":\"Gift Card\",\"types\":[\"givex\",\"svs\"]},{\"name\":\"Credit Card\",\"types\":[\"visa\",\"mc\",\"amex\",\"maestro\",\"uatp\",\"cup\",\"diners\",\"discover\",\"hipercard\",\"jcb\"]}],\"paymentMethods\":[{\"name\":\"PayPal\",\"supportsRecurring\":true,\"type\":\"paypal\"},{\"brands\":[\"visa\",\"mc\",\"amex\",\"maestro\",\"uatp\",\"cup\",\"diners\",\"discover\",\"hipercard\",\"jcb\"],\"details\":[{\"key\":\"encryptedCardNumber\",\"type\":\"cardToken\"},{\"key\":\"encryptedSecurityCode\",\"type\":\"cardToken\"},{\"key\":\"encryptedExpiryMonth\",\"type\":\"cardToken\"},{\"key\":\"encryptedExpiryYear\",\"type\":\"cardToken\"},{\"key\":\"holderName\",\"optional\":true,\"type\":\"text\"}],\"name\":\"Kreditkarte\",\"type\":\"scheme\"},{\"name\":\"Sofort.\",\"supportsRecurring\":true,\"type\":\"directEbanking\"},{\"details\":[{\"key\":\"sepa.ownerName\",\"type\":\"text\"},{\"key\":\"sepa.ibanNumber\",\"type\":\"text\"}],\"name\":\"SEPA Lastschrift\",\"supportsRecurring\":true,\"type\":\"sepadirectdebit\"},{\"name\":\"Rechnung mit Klarna.\",\"supportsRecurring\":true,\"type\":\"klarna\"},{\"details\":[{\"key\":\"bic\",\"optional\":true,\"type\":\"text\"}],\"name\":\"GiroPay\",\"supportsRecurring\":true,\"type\":\"giropay\"},{\"name\":\"Ratenkauf mit Klarna.\",\"supportsRecurring\":true,\"type\":\"klarna_account\"},{\"details\":[{\"key\":\"encryptedCardNumber\",\"type\":\"cardToken\"},{\"key\":\"encryptedSecurityCode\",\"type\":\"cardToken\"},{\"key\":\"encryptedExpiryMonth\",\"type\":\"cardToken\"},{\"key\":\"encryptedExpiryYear\",\"type\":\"cardToken\"},{\"key\":\"holderName\",\"optional\":true,\"type\":\"text\"},{\"key\":\"telephoneNumber\",\"optional\":true,\"type\":\"text\"}],\"name\":\"ExpressPay\",\"supportsRecurring\":true,\"type\":\"cup\"},{\"details\":[{\"key\":\"encryptedCardNumber\",\"type\":\"cardToken\"},{\"key\":\"encryptedSecurityCode\",\"optional\":true,\"type\":\"cardToken\"},{\"key\":\"encryptedExpiryMonth\",\"optional\":true,\"type\":\"cardToken\"},{\"key\":\"encryptedExpiryYear\",\"optional\":true,\"type\":\"cardToken\"},{\"key\":\"encryptedPassword\",\"optional\":true,\"type\":\"cardToken\"},{\"key\":\"holderName\",\"optional\":true,\"type\":\"text\"}],\"name\":\"Givex\",\"supportsRecurring\":true,\"type\":\"givex\"},{\"name\":\"Pay now with Klarna.\",\"supportsRecurring\":true,\"type\":\"klarna_paynow\"},{\"details\":[{\"key\":\"encryptedCardNumber\",\"type\":\"cardToken\"},{\"key\":\"encryptedSecurityCode\",\"optional\":true,\"type\":\"cardToken\"},{\"key\":\"encryptedExpiryMonth\",\"optional\":true,\"type\":\"cardToken\"},{\"key\":\"encryptedExpiryYear\",\"optional\":true,\"type\":\"cardToken\"},{\"key\":\"encryptedPassword\",\"optional\":true,\"type\":\"cardToken\"},{\"key\":\"holderName\",\"optional\":true,\"type\":\"text\"}],\"name\":\"SVS\",\"supportsRecurring\":true,\"type\":\"svs\"}]}",
        "request": "{\"countryCode\":\"DE\",\"shopperLocale\":\"de-DE\",\"amount\":{\"currency\":\"EUR\",\"value\":1000},\"merchantAccount\":\"YOUR_MERCHANT_ACCOUNT\"}",
        "type": "getPaymentMethods"
      }
    }
  ]
}

```

