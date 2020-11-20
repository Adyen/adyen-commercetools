**Please see [Integration Guide](WebComponentsIntegrationGuide.md) first before continuing with this document.**

## Refund
If you want to return the funds to your shopper, for example if they returned an item, you need to make a Refund request.

### Make an API call to refund a payment

#### Prerequisites
It is required that the payment has one `Charge` transaction with state `Success`. From this transaction, the `interactionId` field is being used as `originalReference` for the Adyen refund request.

#### Steps
To make a (partial) refund, [add **at least one** transaction](https://docs.commercetools.com/http-api-projects-payments#add-transaction) with type `Refund` and state `Initial` to the commercetools payment.
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

Extension module will update the transaction with `Pending` transaction state and `interactionId` field with value `pspReference` from the Adyen response:

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
      "type": "Charge",
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
        "request": "{\"modificationAmount\":{\"value\":500,\"currency\":\"EUR\"},\"originalReference\":\"883605782632488F\",\"merchantAccount\":\"CommercetoolsGmbHDE775\"}",
        "type": "refund"
      }
    }
  ]
}
```

### Recommendations
1. Don't add too many `Refund` transactions at once because [API Extension endpoint has a time limit](https://docs.commercetools.com/api/projects/api-extensions#time-limits).
By adding too many transactions at once, extension module will need more time to process all of them and this could lead to long requests and exceeding the time limit.
1. Adyen processes the refunds asynchronously. Therefore the response from Adyen for extension module will always be `refund-received`.
However, the final response comes later for the notification module and it can also contain failure.

### Further resources
1. [Adyen refund documentation](https://docs.adyen.com/checkout/refund)
