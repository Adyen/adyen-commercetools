## Restore

Restore gives your shoppers an opportunity to offset their carbon emissions from the delivery or lifecycle of their purchase at checkout.
For more details of the feature follow official Adyen [Restore](https://www.adyen.com/social-responsibility/impact#restore) documentation.

This document describes the integration steps of restore.

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

**Table of Contents**

- [Step 1: Requesting offset costs](#step-1-requesting-offset-costs)
  - [Delivery Offset](#delivery-offset)
  - [Lifecycle Offset](#lifecycle-offset)
- [Step 2: Making a payment with offset costs (to be defined later.)](#step-2-making-a-payment-with-offset-costs-to-be-defined-later)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Step 1: Requesting offset costs

To request offset costs via our integration, you need to set the `getCarbonOffsetCostsRequest` custom field to your existing commercetools payment or create a payment right away with the custom field set.

The `getCarbonOffsetCostsRequest` custom field has to include the following information:

- Weight of the package
- Delivery - country of origin
- Delivery - country of destination
- Product code (if lifecycle option)
- Product weight (if lifecycle option)

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
  <summary>The commercetools payment representation example with getCarbonOffsetCostsRequest. Click to expand.</summary>

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
  <summary>The commercetools payment representation example with getCarbonOffsetCostsResponse. Click to expand.</summary>

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
  <summary>The commercetools payment representation example with getCarbonOffsetCostsRequest. Click to expand.</summary>

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
  "originCountry": "DE",
  "deliveryCountry": "FR",
  "packageWeight": {
    "value": 2.2,
    "unit": "kg"
  },
  "merchantAccount": "CommercetoolsGmbHDE775",
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
  <summary>The commercetools payment representation example with getCarbonOffsetCostsResponse. Click to expand.</summary>

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

## Step 2: Making a payment with offset costs (to be defined later.)
