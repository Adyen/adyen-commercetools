**Please see [Integration Guide](WebComponentsIntegrationGuide.md) first before continuing with this document.**

## Manual Capture
By default, payments are captured immediately after authorisation. For payment methods that support separate authorisation and capture, you also have the option to capture the payment later, for example only after the goods have been shipped. This allows you to cancel the payment in case of any issues with the shipment. 

### Make an API call to capture a payment:

```json
{
   "modificationAmount":{
      "value":500,
      "currency":"EUR"
   },
   "originalReference":"8313547924770610",
   "reference": "YOUR_UNIQUE_REFERENCE"
}
```

An [update action](https://docs.commercetools.com/http-api-projects-payments#set-customfield) to set `manualCaptureRequest` custom field.

``` json
{
  "action": "setCustomField",
  "name": "manualCaptureRequest",
  "value": "{\"modificationAmount\":{\"value\":500,\"currency\":\"EUR\"},\"originalReference\":\"8313547924770610\",\"reference\":\"YOUR_UNIQUE_REFERENCE\"}"
}
```

The `manualCaptureResponse` contains a PSP reference associated with this manual capture request.

``` json
{
   "pspReference":"8825408195409505",
   "response":"[capture-received]"
} 
```

Additionally, a [Charge](https://docs.commercetools.com/http-api-projects-payments#transactiontype) transaction with `Pending` transaction state will be added to CTP payment with the same Adyen `pspReference` on the `interactionId` field:

```json
{
  "id": "6faada76-d5d5-49c4-8806-05885ac2598f",
  "type": "Charge",
  "amount": {
  "type": "centPrecision",
    "currencyCode": "EUR",
    "centAmount": 500,
    "fractionDigits": 2
  },
  "interactionId": "8825408195409505",
  "state": "Pending"
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
      "makePaymentResponse": "{\"pspReference\":\"852592562372397J\",\"resultCode\":\"Authorised\",\"amount\":{\"currency\":\"EUR\",\"value\":1000},\"merchantReference\":\"YOUR_UNIQUE_REFERENCE\"}",
      "makePaymentRequest": "{\"amount\":{\"currency\":\"EUR\",\"value\":1000},\"reference\":\"YOUR_UNIQUE_REFERENCE\",\"paymentMethod\":{\"type\":\"scheme\",\"encryptedCardNumber\":\"test_4111111111111111\",\"encryptedExpiryMonth\":\"test_03\",\"encryptedExpiryYear\":\"test_2030\",\"encryptedSecurityCode\":\"test_737\"},\"returnUrl\":\"https://your-company.com/\"}",
      "manualCaptureRequest": "{\"modificationAmount\":{\"value\":500,\"currency\":\"EUR\"},\"originalReference\":\"8313547924770610\",\"reference\":\"YOUR_UNIQUE_REFERENCE\"}",
      "manualCaptureResponse": "{\"pspReference\":\"8825408195409505\",\"response\":\"[capture-received]\"}"
    }
  },
  "paymentStatus": {},
  "transactions": [
    {
      "id": "08f7d4bc-41fe-47b2-8745-d2bdf1b24e8a",
      "type": "Authorization",
      "amount": {
        "type": "centPrecision",
        "currencyCode": "EUR",
        "centAmount": 1000,
        "fractionDigits": 2
      },
      "interactionId": "852592562372397J",
      "state": "Success"
    },
    {
      "id": "6faada76-d5d5-49c4-8806-05885ac2598f",
      "type": "Charge",
      "amount": {
        "type": "centPrecision",
        "currencyCode": "EUR",
        "centAmount": 500,
        "fractionDigits": 2
      },
      "interactionId": "8825408195409505",
      "state": "Pending"
    }
  ]
}

```

Once Adyen have processed your capture request, Adyen will send a notification to our [Notification module](./../../notification/README.md)

#### More info
For more detailed information from Adyen's perspective, see [Adyen's documentation](https://docs.adyen.com/checkout/capture#manual-capture).
