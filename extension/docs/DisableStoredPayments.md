<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Disable stored payments](#disable-stored-payments)
  - [Make an API call to disable a stored payment](#make-an-api-call-to-disable-a-stored-payment)
  - [Resources](#resources)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

**Please see [Integration Guide](WebComponentsIntegrationGuide.md) first before continuing with this document.**

## Disable stored payments

A shopper may request to delete their saved details for a certain payment method.

### Make an API call to disable a stored payment

To disable a stored payment, create a new payment with `amountPlanned=0` and the `disableStoredPaymentRequest` custom field.

```json
{
  "amountPlanned": {
    "currencyCode": "EUR",
    "centAmount": 0
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
      "disableStoredPaymentRequest": "{\"shopperReference\":\"YOUR_SHOPPER_REFERENCE\",\"recurringDetailReference\":\"YOUR_RECURRING_DETAIL_REFERENCE\"}",
      "adyenMerchantAccount": "YOUR_MERCHANT_ACCOUNT",
      "commercetoolsProjectKey": "YOUR_COMMERCETOOLS_PROJECT_KEY"
    }
  }
}
```

<details>
  <summary>As a response you will receive the commercetools payment representation with `disableStoredPaymentResponse` custom field. Click to expand an example.</summary>

```json
{
  "id": "b846c275-6c47-4da2-a092-936566db4a4f",
  "version": 3,
  "amountPlanned": {
    "type": "centPrecision",
    "currencyCode": "EUR",
    "centAmount": 0,
    "fractionDigits": 2
  },
  "paymentMethodInfo": {
    "paymentInterface": "ctp-adyen-integration"
  },
  "custom": {
    "type": {
      "typeId": "type",
      "id": "3540c278-dfe9-45a2-94cd-651025019bb2"
    },
    "fields": {
      "disableStoredPaymentRequest": "{\"shopperReference\":\"YOUR_SHOPPER_REFERENCE\",\"recurringDetailReference\":\"YOUR_RECURRING_DETAIL_REFERENCE\"}",
      "adyenMerchantAccount": "YOUR_MERCHANT_ACCOUNT",
      "commercetoolsProjectKey": "YOUR_COMMERCETOOLS_PROJECT_KEY",
      "disableStoredPaymentResponse": "{\"response\":\"[detail-successfully-disabled]\"}"
    }
  }
}
```

</details>

> Note: It is recommended to create a new payment instead of reusing existing payment and adding `disableStoredPaymentRequest`. The reason is disable stored payment is rather a non-payment operation and as such it should not be bound to a real payment. We use payment resource here in commercetools because it has particular benefits for us. For details on this topic [see our ADR](../../docs/adr/0009-non-payment-operations-using-payment.md).

### Resources

https://docs.adyen.com/online-payments/tokenization
