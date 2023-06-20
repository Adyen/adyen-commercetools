<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Manual Capture](#manual-capture)
  - [Make an API call to capture a payment:](#make-an-api-call-to-capture-a-payment)
  - [Partial capture](#partial-capture)
  - [Retry capture requests](#retry-capture-requests)
    - [Generating idempotency key by adyen-integration](#generating-idempotency-key-by-adyen-integration)
  - [Custom manual capture reference](#custom-manual-capture-reference)
  - [More info on capture](#more-info-on-capture)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

**Please see [Integration Guide](WebComponentsIntegrationGuide.md) first before continuing with this document.**

## Manual Capture

By default, payments are captured immediately (or with [delay](https://docs.adyen.com/online-payments/capture#capture-delay)) after authorisation. For payment methods that support separate authorization and capture, you also have the option to capture the payment later, for example only after the goods have been shipped. This also allows you to cancel the payment/authorization.

### Make an API call to capture a payment:

To capture a payment manually, [add a transaction](https://docs.commercetools.com/api/projects/payments#add-transaction) with type `Charge` and state `Initial` to the commercetools payment.

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

### Partial capture

In order to enable multiple partial captures, it is necessary to contact Adyen Support team. For more info, see [Adyen's documentation](https://docs.adyen.com/online-payments/capture#multiple-partial-captures)

### Retry capture requests

To be able to retry capture requests in case of failure, you need to add a custom field with key `idempotencyKey` to the custom type with key `ctp-adyen-integration-transaction-payment-type`. The `addTransaction` action will look like following:

```
{
  "action": "addTransaction",
  "transaction": {
    "type": "Charge",
    "amount": {
      "currencyCode": "EUR",
      "centAmount": 500
    },
    "state": "Initial",
    "custom": {
      "type": {
        "typeId": "type",
        "key": "ctp-adyen-integration-transaction-payment-type"
      },
      "fields": {
        "idempotencyKey": "your-unique-idempotency-key"
      }
    }
  }
}
```

Follow these recommendations when using the idempotency key:

- `idempotencyKey` must be unique per request so that in case the request fails, it can be retried with the same key. Additionally `idempotencyKey` is valid for a minimum period of 31 days after first submission (but may be retained for longer). Source:
- Generate idempotency keys using the version 4 (random) UUID type to prevent two API credentials under the same account from accessing each other's responses.
- Use [exponential backoff](https://en.wikipedia.org/wiki/Exponential_backoff) when retrying.

#### Generating idempotency key by adyen-integration

adyen-integration can automatically generate unique idempotency key for manual capture requests. It uses transaction ID as the idempotency key.

In order to use this feature, set the option [`generateIdempotencyKey=true`](./HowToRun.md#optional-attributes). For every manual capture request adyen-integration will add an idempotency key if the custom field `idempotencyKey` is not present. If the custom field `idempotencyKey` is present, its value will be taken as the idempotency key.

> Note: the generated idempotency key will NOT be saved to the custom field `idempotencyKey`. If you want to see this generated key, you can find it in the interface interactions.

### Custom manual capture reference

If you need to customize the value of the manual capture reference, add a transaction custom field with key `reference` to the custom type with key `ctp-adyen-integration-transaction-payment-type`. The `addTransaction` action will look like following:

```
{
  "action": "addTransaction",
  "transaction": {
    "type": "Charge",
    "amount": {
      "currencyCode": "EUR",
      "centAmount": 500
    },
    "state": "Initial",
    "custom": {
      "type": {
        "typeId": "type",
        "key": "ctp-adyen-integration-transaction-payment-type"
      },
      "fields": {
        "reference": "your-custom-manual-capture-reference"
      }
    }
  }
}
```

### More info on capture

For more detailed information from Adyen's perspective, see following documentation

- [Adyen's documentation](https://docs.adyen.com/checkout/capture#manual-capture).
- [Adyen capture API](https://docs.adyen.com/api-explorer/#/Payment/v64/post/capture).

For in-depth information about API idempotency in Adyen, see [Adyen's documentation](https://docs.adyen.com/development-resources/api-idempotency).
