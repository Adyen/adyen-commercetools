## Restore

Restore gives your shoppers an opportunity to offset their carbon emissions from the delivery or lifecycle of their purchase at checkout.
For more details of the feature follow official Adyen [Restore](https://www.adyen.com/social-responsibility/impact#restore) documentation.

This document describes the integration steps of restore.

> NOTE: Restore is part of checkout process so follow along with [Integration Guide](./WebComponentsIntegrationGuide.md).

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Configuration](#configuration)
- [Requesting offset costs](#requesting-offset-costs)
  - [Delivery Offset](#delivery-offset)
  - [Lifecycle Offset](#lifecycle-offset)
- [Making a payment with offset costs](#making-a-payment-with-offset-costs)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Configuration

Restore feature requires additional configuration. Please [submit a support request](https://www.adyen.help/hc/en-us/requests/new) for the required setup.

In your request please specify which offset type you are choosing and which climate action project you would like to support. The following are available:

1. Offset type:

   - the delivery of purchases or
   - the entire lifecycle of purchases

2. Climate action project:
   - forestry projects or
   - renewable energy projects

## Requesting offset costs

To request offset costs via our integration, you need to set the `getCarbonOffsetCostsRequest` custom field to your existing commercetools payment or create a payment right away with the custom field set. We recommend to request offset costs before [Step 5: Make a payment](./WebComponentsIntegrationGuide.md/#step-5-make-a-payment).

The `getCarbonOffsetCostsRequest` custom field has to include the following information:

- Weight of the package
- Delivery - country of origin
- Delivery - country of destination
- Product code (only for requesting lifecycle offset)
- Product weight (only for requesting lifecycle offset)

### Delivery Offset

Here's an example of the `getCarbonOffsetCostsRequest` to calculate delivery offset:

```json
{
  "originCountry": "DE",
  "deliveryCountry": "FR",
  "packageWeight": {
    "value": 2.2,
    "unit": "kg"
  },
  "merchantAccount": "YOUR_MERCHANT_ACCOUNT"
}
```

<details>
  <summary>The commercetools payment representation example with `getCarbonOffsetCostsRequest`. Click to expand.</summary>

```json
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
      "adyenMerchantAccount": "YOUR_MERCHANT_ACCOUNT",
      "commercetoolsProjectKey": "YOUR_COMMERCETOOLS_PROJECT_KEY",
      "getCarbonOffsetCostsRequest": "{\"originCountry\":\"DE\",\"deliveryCountry\":\"FR\",\"packageWeight\":{\"value\":2.2,\"unit\":\"kg\"},\"merchantAccount\":\"YOUR_MERCHANT_ACCOUNT\"}"
    }
  }
}
```

</details>

The response includes the delivery and total offset costs:

```json
{
  "deliveryOffset": {
    "currency": "EUR",
    "value": 12
  },
  "totalOffset": {
    "currency": "EUR",
    "value": 12
  }
}
```

<details>
  <summary>The commercetools payment representation example with `getCarbonOffsetCostsResponse`. Click to expand.</summary>

```json
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
      "adyenMerchantAccount": "YOUR_MERCHANT_ACCOUNT",
      "commercetoolsProjectKey": "YOUR_COMMERCETOOLS_PROJECT_KEY",
      "getCarbonOffsetCostsRequest": "{\"originCountry\":\"DE\",\"deliveryCountry\":\"FR\",\"packageWeight\":{\"value\":2.2,\"unit\":\"kg\"},\"merchantAccount\":\"YOUR_MERCHANT_ACCOUNT\"}",
      "getCarbonOffsetCostsResponse": "{\"deliveryOffset\":{\"currency\":\"EUR\",\"value\":12},\"totalOffset\":{\"currency\":\"EUR\",\"value\":12}}"
    }
  }
}
```

</details>

### Lifecycle Offset

Here's an example of the `getCarbonOffsetCostsRequest` to calculate delivery and lifecycle offset together:

```json
{
  "originCountry": "DE",
  "deliveryCountry": "FR",
  "packageWeight": {
    "value": 2.2,
    "unit": "kg"
  },
  "merchantAccount": "YOUR_MERCHANT_ACCOUNT",
  "products": [
    {
      "code": "123",
      "weight": {
        "value": 0.2,
        "unit": "kg"
      }
    },
    {
      "code": "10001335",
      "weight": {
        "value": 2,
        "unit": "kg"
      }
    }
  ]
}
```

<details>
  <summary>The commercetools payment representation example with `getCarbonOffsetCostsRequest`. Click to expand.</summary>

```json
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
      "adyenMerchantAccount": "YOUR_MERCHANT_ACCOUNT",
      "commercetoolsProjectKey": "YOUR_COMMERCETOOLS_PROJECT_KEY",
      "getCarbonOffsetCostsRequest": "{\"originCountry\":\"DE\",\"deliveryCountry\":\"FR\",\"packageWeight\":{\"value\":2.2,\"unit\":\"kg\"},\"merchantAccount\":\"YOUR_MERCHANT_ACCOUNT\",\"products\":[{\"code\":\"123\",\"weight\":{\"value\":0.2,\"unit\":\"kg\"}},{\"code\":\"10001335\",\"weight\":{\"value\":2,\"unit\":\"kg\"}}]}"
    }
  }
}
```

</details>

The response includes the delivery, product and total offset costs:

```json
{
  "deliveryOffset": {
    "currency": "EUR",
    "value": 1
  },
  "productOffset": {
    "currency": "EUR",
    "value": 138
  },
  "totalOffset": {
    "currency": "EUR",
    "value": 139
  },
  "unavailableProductCodes": ["123"]
}
```

<details>
  <summary>The commercetools payment representation example with `getCarbonOffsetCostsResponse`. Click to expand.</summary>

```json
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
      "adyenMerchantAccount": "YOUR_MERCHANT_ACCOUNT",
      "commercetoolsProjectKey": "YOUR_COMMERCETOOLS_PROJECT_KEY",
      "getCarbonOffsetCostsRequest": "{\"originCountry\":\"DE\",\"deliveryCountry\":\"FR\",\"packageWeight\":{\"value\":2.2,\"unit\":\"kg\"},\"merchantAccount\":\"YOUR_MERCHANT_ACCOUNT\",\"products\":[{\"code\":\"123\",\"weight\":{\"value\":0.2,\"unit\":\"kg\"}},{\"code\":\"10001335\",\"weight\":{\"value\":2,\"unit\":\"kg\"}}]}",
      "getCarbonOffsetCostsResponse": "{\"deliveryOffset\":{\"currency\":\"EUR\",\"value\":1},\"productOffset\":{\"currency\":\"EUR\",\"value\":138},\"totalOffset\":{\"currency\":\"EUR\",\"value\":139},\"unavailableProductCodes\":[\"123\"]}"
    }
  }
}
```

</details>

## Create a payment session with offset costs

To integrate offset costs as part of the payment, you'll need to send the [splits](https://docs.adyen.com/api-explorer/#/CheckoutService/latest/post/payments__reqParam_splits) array.

For example, if the cart's total amount is 10.00 EUR, and the calculated totalOffsetCost is 00.12 EUR, then both amounts have to be supplied as `splits` as shown below:

- 00.12 EUR goes to charity for carbon offset with account BA0000X000000X0XXX0X00XXX.
- 10.00 EUR goes to the seller's account as payment for the goods.

```json
{
  "splits": [
    {
      "amount": {
        "value": 12
      },
      "type": "BalanceAccount",
      "account": "BA0000X000000X0XXX0X00XXX",
      "reference": "Restore"
    },
    {
      "amount": {
        "value": 1000
      },
      "type": "Default",
      "reference": "Payment"
    }
  ]
}
```

To crate payment session via our integration, you need to set the `createSessionRequest` custom field to existing commercetools payment, those steps are described already on the web components integration guide on [Step 4. Create a payment session](./WebComponentsIntegrationGuide.md#step-4-create-a-payment-session). As stated there, the create session request payload only requires basic information like amount, currency, return URL, etc. To create a payment session with offset costs included, the merchant server needs to extend the payload with the required amount splits.
