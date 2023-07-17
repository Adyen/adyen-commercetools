<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Refund](#refund)
  - [Make an API call to refund a payment](#make-an-api-call-to-refund-a-payment)
    - [Prerequisites](#prerequisites)
    - [Steps](#steps)
  - [Custom refund reference](#custom-refund-reference)
  - [Retry refund requests](#retry-refund-requests)
    - [Generating idempotency key by adyen-integration](#generating-idempotency-key-by-adyen-integration)
  - [Additional information](#additional-information)
  - [Further resources](#further-resources)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

**Please see [Integration Guide](WebComponentsIntegrationGuide.md) first before continuing with this document.**

## Refund

If you want to return the funds to your shopper, for example if they returned an item, you need to make a Refund request.

### Make an API call to refund a payment

#### Prerequisites

It is required that the payment has a transaction of type `Authorization` and state `Success`.
From `Authorized` transaction, the `interactionId` field is being used as `originalReference` for the Adyen refund request.

#### Steps

To make a (partial) refund, [add **at least one** transaction](https://docs.commercetools.com/api/projects/payments#add-transaction) with type `Refund` and state `Initial` to the commercetools payment.
It is possible to add multiple `Refund` transactions and all of them will be processed in parallel.

```json
{
  "action": "addTransaction",
  "transaction": {
    "type": "Refund",
    "amount": {
      "currencyCode": "EUR",
      "centAmount": 500
    },
    "state": "Initial"
  }
}
```

Extension module will update the transaction with `Pending` transaction state and `interactionId` field with the value `pspReference` from the Adyen response:

```json
{
  "id": "a4504b99-d46e-484e-1344-ee4c3b6de1a2",
  "type": "Refund",
  "amount": {
    "type": "centPrecision",
    "currencyCode": "EUR",
    "centAmount": 500,
    "fractionDigits": 2
  },
  "interactionId": "883592922122044H",
  "state": "Pending"
}
```

Request/response between Adyen and extension module are stored in `interfaceInteraction` field of the payment with type `refund`.

The commercetools payment representation after a successful refund:

```json
{
  "id": "ca068e31-c2f1-410a-912d-d12bf3c645b2",
  "key": "14",
  "amountPlanned": {
    "type": "centPrecision",
    "currencyCode": "EUR",
    "centAmount": 1000,
    "fractionDigits": 2
  },
  "paymentMethodInfo": {
    "paymentInterface": "ctp-adyen-integration"
  },
  "transactions": [
    {
      "id": "98d62c56-9a72-4b96-8cb7-f9fe68181085",
      "type": "Authorization",
      "amount": {
        "type": "centPrecision",
        "currencyCode": "EUR",
        "centAmount": 1000,
        "fractionDigits": 2
      },
      "interactionId": "883605782632488F",
      "state": "Success"
    },
    {
      "id": "5d3e8fc1-bdb7-4e34-b3e9-8b34c3f60135",
      "type": "Refund",
      "amount": {
        "type": "centPrecision",
        "currencyCode": "EUR",
        "centAmount": 500,
        "fractionDigits": 2
      },
      "interactionId": "853605802634337B",
      "state": "Pending"
    }
  ],
  "interfaceInteractions": [
    {
      "type": {
        "typeId": "type",
        "id": "5d93411a-9736-43ba-9f4d-5f14158427ba"
      },
      "fields": {
        "createdAt": "2020-11-19T16:17:14.247Z",
        "response": "{\"pspReference\":\"853605802634337B\",\"response\":\"[refund-received]\"}",
        "request": "{\"modificationAmount\":{\"value\":500,\"currency\":\"EUR\"},\"originalReference\":\"883605782632488F\",\"merchantAccount\":\"YOUR_MERCHANT_ACCOUNT\"}",
        "type": "refund"
      }
    }
  ]
}
```

### Custom refund reference

By default, the refund reference field is taken from the payment key. If you need to customize the value of the refund reference, add a transaction custom field with key `reference` to the custom type with key `ctp-adyen-integration-transaction-payment-type`. The `addTransaction` action will look like following:

```
{
  "action": "addTransaction",
  "transaction": {
    "type": "Refund",
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
        "reference": "your-custom-refund-reference"
      }
    }
  }
}
```

### Retry refund requests

To be able to retry refund requests in case of failure, you need to add a custom field with key `idempotencyKey` to the custom type with key `ctp-adyen-integration-transaction-payment-type`. The `addTransaction` action will look like following:

```
{
  "action": "addTransaction",
  "transaction": {
    "type": "Refund",
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

adyen-integration can automatically generate unique idempotency key for refund requests. It uses transaction ID as the idempotency key.

In order to use this feature, set the option [`generateIdempotencyKey=true`](./HowToRun.md#optional-attributes). For every refund request adyen-integration will add an idempotency key if the custom field `idempotencyKey` is not present. If the custom field `idempotencyKey` is present, its value will be taken as the idempotency key.

> Note: the generated idempotency key will NOT be saved to the custom field `idempotencyKey`. If you want to see this generated key, you can find it in the interface interactions.

### Additional information

1. Don't add too many `Refund` transactions at once because [API Extension endpoint has a time limit](https://docs.commercetools.com/api/projects/api-extensions#time-limits).
   By adding too many transactions at once, extension module will need more time to process all of them and this could lead to long requests and exceeding the time limit.
1. Adyen processes the refunds asynchronously. Therefore the response from Adyen for extension module will always be `refund-received`.
   However, the final response comes later for the notification module and it can also contain failure.
1. [Unreferenced refund](https://docs.adyen.com/checkout/refund#unreferenced-refund) is not supported.

### Further resources

1. [Adyen refund documentation](https://docs.adyen.com/checkout/refund)
1. [Adyen refund API](https://docs.adyen.com/api-explorer/#/Payment/v68/post/refund)
1. [API idempotency](https://docs.adyen.com/development-resources/api-idempotency)
