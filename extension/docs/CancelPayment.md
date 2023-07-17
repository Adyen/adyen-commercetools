<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Cancel a payment](#cancel-a-payment)
  - [Make an API call to cancel a payment](#make-an-api-call-to-cancel-a-payment)
    - [Prerequisites](#prerequisites)
    - [Steps](#steps)
  - [Additional information](#additional-information)
  - [Further resources](#further-resources)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

**Please see [Integration Guide](WebComponentsIntegrationGuide.md) first before continuing with this document.**

## Cancel a payment

If you have authorised a payment but do not want to capture it, you need to make a Cancel request to release the funds back to the shopper.
If the payment has already been captured, you need to [refund it](./Refund.md) instead.

### Make an API call to cancel a payment

#### Prerequisites

It is required that the payment has one `Authorization` transaction with state `Success`.
From this transaction, the `interactionId` field is being used as `originalReference` for the Adyen cancel request.

#### Steps

To make a cancellation, [add a transaction](https://docs.commercetools.com/api/projects/payments#add-transaction)
with type `CancelAuthorization` and state `Initial` to the commercetools payment.

```json
{
  "action": "addTransaction",
  "transaction": {
    "type": "CancelAuthorization",
    "amount": {
      "currencyCode": "EUR",
      "centAmount": 500
    },
    "state": "Initial"
  }
}
```

Extension module will update the commercetools transaction with `Pending` transaction state and `interactionId` field with value `pspReference` from the Adyen response:

```json
{
  "id": "a4504b99-d46e-484e-1344-ee4c3b6de1a2",
  "type": "CancelAuthorization",
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

Request/response between Adyen and extension module are stored in `interfaceInteraction` field of the payment with type `cancelPayment`.
The commercetools payment representation after a successful `CancelAuthorization` request:

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
      "type": "CancelAuthorization",
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
        "response": "{\"pspReference\":\"853605802634337B\",\"response\":\"[cancel-received]\"}",
        "request": "{\"originalReference\":\"883605782632488F\",\"merchantAccount\":\"YOUR_MERCHANT_ACCOUNT\"}",
        "type": "cancelPayment"
      }
    }
  ]
}
```

### Additional information

1. The `amount` field in the transaction is ignored. Adyen doesn't require the amount to be provided as cancellation could be done only for the whole amount.
1. [Technical cancel](https://docs.adyen.com/checkout/cancel#technical-cancel) is not supported.

### Further resources

1. [Adyen cancel documentation](https://docs.adyen.com/checkout/cancel)
