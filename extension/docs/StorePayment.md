<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

**Table of Contents** _generated with [DocToc](https://github.com/thlorenz/doctoc)_

- [Store payment details](#store-payment-details)
  - [Make an API call to store payment details](#make-an-api-call-to-store-payment-details)
    - [One-off payments](#one-off-payments)
    - [Subscriptions](#subscriptions)
    - [Automatic top-ups](#automatic-top-ups)
  - [Delete stored payments](#delete-stored-payments)
  - [Resources](#resources)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

**Please see [Integration Guide](WebComponentsIntegrationGuide.md) first before continuing with this document.**

## Store payment details

With Adyen, you can securely store one or more payment details per shopper. This allows you to offer subscription payments, automatic top-ups to shopper accounts, and give your shoppers a faster checkout experience by using their stored card.

### Make an API call to store payment details

There are a couple of ways how you can store the payment.

#### One-off payments

One-off transactions where a shopper stores payment details or where the shopper purchases from your website or app at a later time using the saved details.

To save payment details for one-off payments, [add following fields to your `makePaymentRequest`](./WebComponentsIntegrationGuide.md#step-5-make-a-payment):

- `shopperReference: 'YOUR_SHOPPER_REFERENCE'` - `shopperReference` will be later used for managing the stored payment details.
- `shopperInteraction: Ecommerce`
- `recurringProcessingModel: CardOnFile`
- `storePaymentMethod: true`
- `removeSensitiveData: false` - set this if your adyen-integration is deployed with `removeSensitiveData: true` configuration. The reason is by default stored payment details are returned in `additionalData` and this field is being removed when `removeSensitiveData: true`.

<details>
<summary>Click to expand an example `makePaymentRequest`</summary>

```json
{
  "amount": {
    "currency": "EUR",
    "value": 1000
  },
  "reference": "YOUR_REFERENCE",
  "paymentMethod": {
    "type": "scheme",
    "encryptedCardNumber": "test_4111111111111111",
    "encryptedExpiryMonth": "test_03",
    "encryptedExpiryYear": "test_2030",
    "encryptedSecurityCode": "test_737"
  },
  "additionalData": {
    "allow3DS2": true
  },
  "channel": "Web",
  "origin": "https://your-company.com",
  "returnUrl": "https://your-company.com/...",
  "merchantAccount": "YOUR_MERCHANT_ACCOUNT",
  "storePaymentMethod": true,
  "shopperReference": "YOUR_SHOPPER_REFERENCE",
  "shopperInteraction": "Ecommerce",
  "recurringProcessingModel": "CardOnFile",
  "removeSensitiveData": false
}
```

</details>

<details>
<summary>The commercetools payment representation example with `makePaymentRequest` and `makePaymentResponse` with stored payment. Click to expand.</summary>

```json
{
  "key": "YOUR_PAYMENT_KEY",
  "amountPlanned": {
    "type": "centPrecision",
    "currencyCode": "EUR",
    "centAmount": 1000,
    "fractionDigits": 2
  },
  "paymentMethodInfo": {
    "paymentInterface": "ctp-adyen-integration",
    "method": "scheme",
    "name": {
      "en": "Credit Card"
    }
  },
  "custom": {
    "type": {
      "typeId": "type",
      "id": "3540c278-dfe9-45a2-94cd-651025019bb2"
    },
    "fields": {
      "makePaymentRequest": "{\"amount\":{\"currency\":\"EUR\",\"value\":1000},\"reference\":\"YOUR_PAYMENT_REFERENCE\",\"paymentMethod\":{\"type\":\"scheme\",\"encryptedCardNumber\":\"CARD_NUMBER\",\"encryptedExpiryMonth\":\"MONTH\",\"encryptedExpiryYear\":\"YEAR\",\"encryptedSecurityCode\":\"CVV\"},\"storePaymentMethod\":true,\"shopperReference\":\"YOUR_SHOPPER_REFERENCE\",\"shopperInteraction\":\"Ecommerce\",\"recurringProcessingModel\":\"CardOnFile\",\"returnUrl\":\"https://your-company.com/\",\"removeSensitiveData\":false}",
      "adyenMerchantAccount": "YOUR_MERCHANT_ACCOUNT",
      "commercetoolsProjectKey": "YOUR_COMMERCETOOLS_PROJECT_KEY",
      "makePaymentResponse": "{\"additionalData\":{\"recurring.contractTypes\":\"RECURRING,ONECLICK\",\"recurring.recurringDetailReference\":\"T3BC7TQWZ2M84H82\",\"recurringProcessingModel\":\"CardOnFile\",\"recurring.shopperReference\":\"YOUR_SHOPPER_REFERENCE\"},\"pspReference\":\"WQSD8FL3D8NKGK82\",\"resultCode\":\"Authorised\",\"amount\":{\"currency\":\"EUR\",\"value\":1000},\"merchantReference\":\"YOUR_PAYMENT_KEY\"}"
    }
  }
}
```

</details>

#### Subscriptions

Let your shoppers set up subscriptions with you. Subscriptions are a series of transactions with fixed or variable amounts, charged at a fixed time interval.

To save payment details for subscription payments, [add following fields to your `makePaymentRequest`](./WebComponentsIntegrationGuide.md#step-5-make-a-payment):

- `shopperReference: 'YOUR_SHOPPER_REFERENCE'` - `shopperReference` will be later used for managing the stored payment details.
- `shopperInteraction: Ecommerce`
- `recurringProcessingModel: Subscription`
- `storePaymentMethod: true`
- `removeSensitiveData: false` - set this if your adyen-integration is deployed with `removeSensitiveData: true` configuration. The reason is by default stored payment details are returned in `additionalData` and this field is being removed when `removeSensitiveData: true`.

<details>
<summary>Click to expand an example `makePaymentRequest`</summary>

```json
{
  "amount": {
    "currency": "EUR",
    "value": 1000
  },
  "reference": "YOUR_REFERENCE",
  "paymentMethod": {
    "type": "scheme",
    "encryptedCardNumber": "test_4111111111111111",
    "encryptedExpiryMonth": "test_03",
    "encryptedExpiryYear": "test_2030",
    "encryptedSecurityCode": "test_737"
  },
  "additionalData": {
    "allow3DS2": true
  },
  "channel": "Web",
  "origin": "https://your-company.com",
  "returnUrl": "https://your-company.com/...",
  "merchantAccount": "YOUR_MERCHANT_ACCOUNT",
  "storePaymentMethod": true,
  "shopperReference": "YOUR_SHOPPER_REFERENCE",
  "shopperInteraction": "Ecommerce",
  "recurringProcessingModel": "Subscription",
  "removeSensitiveData": false
}
```

</details>

<details>
<summary>The commercetools payment representation example with `makePaymentRequest` and `makePaymentResponse` with stored payment. Click to expand.</summary>

```json
{
  "key": "YOUR_PAYMENT_KEY",
  "amountPlanned": {
    "type": "centPrecision",
    "currencyCode": "EUR",
    "centAmount": 1000,
    "fractionDigits": 2
  },
  "paymentMethodInfo": {
    "paymentInterface": "ctp-adyen-integration",
    "method": "scheme",
    "name": {
      "en": "Credit Card"
    }
  },
  "custom": {
    "type": {
      "typeId": "type",
      "id": "3540c278-dfe9-45a2-94cd-651025019bb2"
    },
    "fields": {
      "makePaymentRequest": "{\"amount\":{\"currency\":\"EUR\",\"value\":1000},\"reference\":\"YOUR_PAYMENT_REFERENCE\",\"paymentMethod\":{\"type\":\"scheme\",\"encryptedCardNumber\":\"CARD_NUMBER\",\"encryptedExpiryMonth\":\"MONTH\",\"encryptedExpiryYear\":\"YEAR\",\"encryptedSecurityCode\":\"CVV\"},\"storePaymentMethod\":true,\"shopperReference\":\"YOUR_SHOPPER_REFERENCE\",\"shopperInteraction\":\"Ecommerce\",\"recurringProcessingModel\":\"Subscription\",\"returnUrl\":\"https://your-company.com/\",\"removeSensitiveData\":false}",
      "adyenMerchantAccount": "YOUR_MERCHANT_ACCOUNT",
      "commercetoolsProjectKey": "YOUR_COMMERCETOOLS_PROJECT_KEY",
      "makePaymentResponse": "{\"additionalData\":{\"recurring.contractTypes\":\"RECURRING,ONECLICK\",\"recurring.recurringDetailReference\":\"FRLGRVN7G6KXWD82\",\"recurringProcessingModel\":\"Subscription\",\"recurring.shopperReference\":\"YOUR_SHOPPER_REFERENCE\"},\"pspReference\":\"WQSD8FL3D8NKGK82\",\"resultCode\":\"Authorised\",\"amount\":{\"currency\":\"EUR\",\"value\":1000},\"merchantReference\":\"YOUR_PAYMENT_KEY\"}"
    }
  }
}
```

</details>

#### Automatic top-ups

Offer contracts that occur on a non-fixed schedule using stored card details, for example, automatic top-ups when the cardholder's balance drops below a certain amount.

To save payment details for automatic top-ups payments, [add following fields to your `makePaymentRequest`](./WebComponentsIntegrationGuide.md#step-5-make-a-payment):

- `shopperReference: 'YOUR_SHOPPER_REFERENCE'` - `shopperReference` will be later used for managing the stored payment details.
- `shopperInteraction: Ecommerce`
- `recurringProcessingModel: UnscheduledCardOnFile`
- `storePaymentMethod: true`
- `removeSensitiveData: false` - set this if your adyen-integration is deployed with `removeSensitiveData: true` configuration. The reason is by default stored payment details are returned in `additionalData` and this field is being removed when `removeSensitiveData: true`.

<details>
<summary>Click to expand an example `makePaymentRequest`</summary>

```json
{
  "amount": {
    "currency": "EUR",
    "value": 1000
  },
  "reference": "YOUR_REFERENCE",
  "paymentMethod": {
    "type": "scheme",
    "encryptedCardNumber": "test_4111111111111111",
    "encryptedExpiryMonth": "test_03",
    "encryptedExpiryYear": "test_2030",
    "encryptedSecurityCode": "test_737"
  },
  "additionalData": {
    "allow3DS2": true
  },
  "channel": "Web",
  "origin": "https://your-company.com",
  "returnUrl": "https://your-company.com/...",
  "merchantAccount": "YOUR_MERCHANT_ACCOUNT",
  "storePaymentMethod": true,
  "shopperReference": "YOUR_SHOPPER_REFERENCE",
  "shopperInteraction": "Ecommerce",
  "recurringProcessingModel": "UnscheduledCardOnFile",
  "removeSensitiveData": false
}
```

</details>

<details>
<summary>The commercetools payment representation example with `makePaymentRequest` and `makePaymentResponse` with stored payment. Click to expand.</summary>

```json
{
  "key": "YOUR_PAYMENT_KEY",
  "amountPlanned": {
    "type": "centPrecision",
    "currencyCode": "EUR",
    "centAmount": 1000,
    "fractionDigits": 2
  },
  "paymentMethodInfo": {
    "paymentInterface": "ctp-adyen-integration",
    "method": "scheme",
    "name": {
      "en": "Credit Card"
    }
  },
  "custom": {
    "type": {
      "typeId": "type",
      "id": "3540c278-dfe9-45a2-94cd-651025019bb2"
    },
    "fields": {
      "makePaymentRequest": "{\"amount\":{\"currency\":\"EUR\",\"value\":1000},\"reference\":\"YOUR_PAYMENT_REFERENCE\",\"paymentMethod\":{\"type\":\"scheme\",\"encryptedCardNumber\":\"CARD_NUMBER\",\"encryptedExpiryMonth\":\"MONTH\",\"encryptedExpiryYear\":\"YEAR\",\"encryptedSecurityCode\":\"CVV\"},\"storePaymentMethod\":true,\"shopperReference\":\"YOUR_SHOPPER_REFERENCE\",\"shopperInteraction\":\"Ecommerce\",\"recurringProcessingModel\":\"UnscheduledCardOnFile\",\"returnUrl\":\"https://your-company.com/\",\"removeSensitiveData\":false}",
      "adyenMerchantAccount": "YOUR_MERCHANT_ACCOUNT",
      "commercetoolsProjectKey": "YOUR_COMMERCETOOLS_PROJECT_KEY",
      "makePaymentResponse": "{\"additionalData\":{\"recurring.contractTypes\":\"RECURRING,ONECLICK\",\"recurring.recurringDetailReference\":\"REB68N7G6KXWD82\",\"recurringProcessingModel\":\"UnscheduledCardOnFile\",\"recurring.shopperReference\":\"YOUR_SHOPPER_REFERENCE\"},\"pspReference\":\"ROIUY7FL3D8NKGK82\",\"resultCode\":\"Authorised\",\"amount\":{\"currency\":\"EUR\",\"value\":1000},\"merchantReference\":\"YOUR_PAYMENT_KEY\"}"
    }
  }
}
```

</details>

### Delete stored payments

To delete stored payment details, see [Disable stored payments documentation](./DisableStoredPayments.md).

### Resources

https://docs.adyen.com/online-payments/tokenization/create-and-use-tokens
