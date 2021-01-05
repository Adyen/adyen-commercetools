<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

**Table of Contents**

<!-- *generated with [DocToc](https://github.com/thlorenz/doctoc)* -->

- [Manual Capture](#manual-capture)
  - [Make an API call to capture a payment:](#make-an-api-call-to-capture-a-payment)
    - [More info](#more-info)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

**Please see [Integration Guide](WebComponentsIntegrationGuide.md) first before continuing with this document.**

## Manual Capture

By default, payments are captured immediately after authorisation. For payment methods that support separate authorisation and capture, you also have the option to capture the payment later, for example only after the goods have been shipped. This allows you to cancel the payment in case of any issues with the shipment.

### Make an API call to capture a payment:

To capture a payment manually, [add a transaction](https://docs.commercetools.com/http-api-projects-payments#add-transaction) with type `Charge` and state `Initial` to the commercetools payment.

```json
{
  "action": "addTransaction",
  "transaction": {
    "type": "Charge",
    "amount": {
      "currencyCode": "EUR",
      "centAmount": 500
    },
    "state": "Initial"
  }
}
```

Extension module will update the transaction with `Pending` transaction state and `interactionId` field with value `pspReference` from the Adyen response:

```json
{
  "id": "a2904b53-d79a-484e-8954-ee4c3b6de1a2",
  "type": "Charge",
  "amount": {
    "type": "centPrecision",
    "currencyCode": "EUR",
    "centAmount": 500,
    "fractionDigits": 2
  },
  "interactionId": "883592922122044A",
  "state": "Pending"
}
```

Request/response between Adyen and extension module are stored in `interfaceInteraction` field of the payment with type `manualCapture`:

The commercetools payment representation after a successful capture:

```json
{
  "transactions": [
    {
      "id": "f91e1fd9-cf08-41f8-9785-ed4b76658e39",
      "type": "Authorization",
      "amount": {
        "type": "centPrecision",
        "currencyCode": "EUR",
        "centAmount": 1000,
        "fractionDigits": 2
      },
      "interactionId": "883592826488441K",
      "state": "Success"
    },
    {
      "id": "a2904b53-d79a-484e-8954-ee4c3b6de1a2",
      "type": "Charge",
      "amount": {
        "type": "centPrecision",
        "currencyCode": "EUR",
        "centAmount": 500,
        "fractionDigits": 2
      },
      "interactionId": "883592922122044A",
      "state": "Pending"
    }
  ],
  "interfaceInteractions": [
    {
      "type": {
        "typeId": "type",
        "id": "e6a36f88-58a4-46f5-998b-214973b0427b"
      },
      "fields": {
        "type": "manualCapture",
        "request": "{\"modificationAmount\":{\"value\":500,\"currency\":\"EUR\"},\"originalReference\":\"883592826488441K\",\"reference\":\"YOUR_UNIQUE_REFERENCE\",\"merchantAccount\":\"YOUR_MERCHANT_ACCOUNT\"}",
        "response": "{\"pspReference\":\"883592922122044A\",\"response\":\"[capture-received]\"}",
        "createdAt": "2020-06-23T14:22:02.668Z"
      }
    }
  ]
}
```

Once Adyen have processed your capture request, Adyen will send a notification to our [Notification module](./../../notification/README.md).

#### More info

For more detailed information from Adyen's perspective, see [Adyen's documentation](https://docs.adyen.com/checkout/capture#manual-capture).
