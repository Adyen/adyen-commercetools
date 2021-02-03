# Integration Guide

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

**Table of Contents**

- [Web Components integration guide](#web-components-integration-guide)
  - [How it works](#how-it-works)
  - [Before you begin](#before-you-begin)
  - [Step 1: commercetools checkout validations](#step-1-commercetools-checkout-validations)
    - [Validate cart state](#validate-cart-state)
    - [Recalculate cart](#recalculate-cart)
    - [Validate payment](#validate-payment)
    - [Validate payment transaction](#validate-payment-transaction)
  - [Step 2: Get available payment methods](#step-2-get-available-payment-methods)
  - [Step 3: Add Components to your payments form](#step-3-add-components-to-your-payments-form)
  - [Step 4: Make a payment](#step-4-make-a-payment)
    - [Klarna payment](#klarna-payment)
  - [Step 5: Submit additional payment details](#step-5-submit-additional-payment-details)
  - [Step 6: Capture payment (required for Klarna)](#step-6-capture-payment-required-for-klarna)
  - [Error handling](#error-handling)
    - [Extension module errors](#extension-module-errors)
    - [Adyen payment refusals](#adyen-payment-refusals)
    - [Shopper successfully paid but `redirectUrl` was not reached](#shopper-successfully-paid-but-redirecturl-was-not-reached)
    - [Shopper tries to pay a different amount than the actual order amount](#shopper-tries-to-pay-a-different-amount-than-the-actual-order-amount)
  - [Test and go live](#test-and-go-live)
- [Manual Capture](#manual-capture)
- [Cancel or refund](#cancel-or-refund)
- [Bad Practices](#bad-practices)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# Web Components integration guide

Terms used in this guide:

- **Shopper** - a person that's using the shop.
- **Browser** - frontend part of the checkout UI (web shop).
- **Merchant server** - backend part of the checkout.
- **Extension module** - extension module configured as [commercetools HTTP API Extensions](https://docs.commercetools.com/http-api-projects-api-extensions) is handling checkout steps by intercepting payment modifications and executing communication with Adyen API.
- **Notification module** - [notification module](./../../notification/README.md) processes asynchronous notifications from Adyen and stores payment state changes in commercetools payment object.

The following diagram shows checkout integration flow based on [Adyen Web Components](https://docs.adyen.com/checkout/components-web).

![Flow](https://user-images.githubusercontent.com/803826/98081637-c467a380-1e77-11eb-93ed-003f7e68b59a.png)

## How it works

- [Step 1](#step-1-commercetools-checkout-validations) : Execute required checkout validations.
- [Step 2](#step-2-get-available-payment-methods): Set `getPaymentMethodsRequest` custom field to commercetools payment to get the list of payment methods available for the checkout.
- [Step 3](#step-3-add-components-to-your-payments-form): Add Adyen Web Component to your checkout payments form.
- [Step 4](#step-4-make-a-payment): Submit a payment request by setting `makePaymentRequest` payment custom field with the payment data returned by the Adyen web component.
- [Step 5](#step-5-submit-additional-payment-details): Set `submitAdditionalPaymentDetailsRequest ` custom field to commercetools payment to submit additional payment details.
- [Step 6](#step-6-capture-payment-required-for-klarna): Add an optional `Charge` transaction to commercetools payment in order to manually capture the payment.

## Before you begin

In order to make the extension module up and running, follow our [how to run guide](./HowToRun.md). For the sake of readability,
the field [`applicationInfo`](https://docs.adyen.com/development-resources/building-adyen-solutions#building-a-plugin) is ommitted from all the examples in this document.
In real requests, [`applicationInfo`](https://docs.adyen.com/development-resources/building-adyen-solutions#building-a-plugin)` is always added.

## Step 1: commercetools checkout validations

[merchant server](#web-components-integration-guide) should execute the following validations:

1. On each checkout step [validate cart state](#validate-cart-state)
1. Before starting a new payment process make sure there are no paid payments on the cart already:
   - [Recalculate cart](#recalculate-cart)
   - [Validate payment](#validate-payment)
   - [Validate payment transaction](#validate-payment-transaction)

If all the above validations passed then the order can be created right away and order confirmation page shown.
Otherwise, the shopper might continue with further payment steps.

### Validate cart state

Check if [current cart has been ordered already](https://docs.commercetools.com/http-api-projects-carts#cartstate) (`Cart.cartState = Ordered`).
In this case, load order by ordered cart ID and show order confirmation page.
This might happen if the cart has been already ordered in a different tab (edge case)
or by an optional asynchronous process like [commercetools-payment-to-order-processor job](https://github.com/commercetools/commercetools-payment-to-order-processor).

### Recalculate cart

[Execute cart recalculate](https://docs.commercetools.com/http-api-projects-carts#recalculate) to ensure:

- Cart totals are always up-to-date
- Time-limited discounts are eventually removed from the cart (discounts are validated on re-calculate and order creation only).

### Validate payment

There must be at least one commercetools payment object of type Adyen (`Payment.paymentMethodInfo.paymentInterface = ctp-adyen-integration`).

### Validate payment transaction

Cart's payment counts as successful if there is at least one payment object
with successful transaction state (`Payment.Transaction.state=Success`)
and transaction type `Authorization` or `Charge`.

## Step 2: Get available payment methods (Optional)

When your shopper is ready to pay, get a list of the available payment methods based on their country and the payment amount.

[Create/Update commercetools payment](https://docs.commercetools.com/http-api-projects-payments#create-a-payment) with `getPaymentMethodsRequest` custom field.

> Refer Adyen's [/paymentMethods](https://docs.adyen.com/api-explorer/#/PaymentSetupAndVerificationService/paymentMethods) request to check all possible request payload parameters.

Set `getPaymentMethodsRequest` custom field for a shopper in the Germany, for a payment of `10 EUR`:

```json
{
  "countryCode": "DE",
  "shopperLocale": "de-DE",
  "amount": {
    "currency": "EUR",
    "value": 1000
  }
}
```

The commercetools payment representation example:

```json
{
  "custom": {
    "type": {
      "typeId": "type",
      "key": "ctp-adyen-integration-web-components-payment-type"
    },
    "fields": {
      "getPaymentMethodsRequest": "{\"countryCode\":\"DE\",\"shopperLocale\":\"de-DE\",\"amount\":{\"currency\":\"EUR\",\"value\":1000}}"
    }
  }
}
```

If you are [creating a commercetools payment](https://docs.commercetools.com/http-api-projects-payments#create-a-payment), the payment draft have to contain the `paymentMethodInfo.paymentInterface = ctp-adyen-integration` and `amountPlanned` value, for example:

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
      "getPaymentMethodsRequest": "{\"countryCode\":\"DE\",\"shopperLocale\":\"de-DE\",\"amount\":{\"currency\":\"EUR\",\"value\":1000}}"
    }
  }
}
```

The response includes the list of available payment methods:

```json
{
  "paymentMethods": [
    {
      "name": "Credit Card",
      "type": "scheme"
    },
    {
      "name": "SEPA Direct Debit",
      "type": "sepadirectdebit"
    }
  ]
}
```

The commercetools payment representation example:

```json
{
  "custom": {
    "type": {
      "typeId": "type",
      "key": "ctp-adyen-integration-web-components-payment-type"
    },
    "fields": {
      "getPaymentMethodsRequest": "{\"countryCode\":\"DE\",\"shopperLocale\":\"de-DE\",\"amount\":{\"currency\":\"EUR\",\"value\":1000}}",
      "getPaymentMethodsResponse": "{\"groups\":[{\"name\":\"Gift Card\",\"types\":[\"givex\",\"svs\"]},{\"name\":\"Credit Card\",\"types\":[\"visa\",\"mc\",\"amex\",\"maestro\",\"uatp\",\"cup\",\"diners\",\"discover\",\"hipercard\",\"jcb\"]}],\"paymentMethods\":[{\"name\":\"PayPal\",\"supportsRecurring\":true,\"type\":\"paypal\"},{\"brands\":[\"visa\",\"mc\",\"amex\",\"maestro\",\"uatp\",\"cup\",\"diners\",\"discover\",\"hipercard\",\"jcb\"],\"details\":[{\"key\":\"encryptedCardNumber\",\"type\":\"cardToken\"},{\"key\":\"encryptedSecurityCode\",\"type\":\"cardToken\"},{\"key\":\"encryptedExpiryMonth\",\"type\":\"cardToken\"},{\"key\":\"encryptedExpiryYear\",\"type\":\"cardToken\"},{\"key\":\"holderName\",\"optional\":true,\"type\":\"text\"}],\"name\":\"Kreditkarte\",\"type\":\"scheme\"},{\"name\":\"Sofort.\",\"supportsRecurring\":true,\"type\":\"directEbanking\"},{\"details\":[{\"key\":\"sepa.ownerName\",\"type\":\"text\"},{\"key\":\"sepa.ibanNumber\",\"type\":\"text\"}],\"name\":\"SEPA Lastschrift\",\"supportsRecurring\":true,\"type\":\"sepadirectdebit\"},{\"name\":\"Rechnung mit Klarna.\",\"supportsRecurring\":true,\"type\":\"klarna\"},{\"details\":[{\"key\":\"bic\",\"optional\":true,\"type\":\"text\"}],\"name\":\"GiroPay\",\"supportsRecurring\":true,\"type\":\"giropay\"},{\"name\":\"Ratenkauf mit Klarna.\",\"supportsRecurring\":true,\"type\":\"klarna_account\"},{\"details\":[{\"key\":\"encryptedCardNumber\",\"type\":\"cardToken\"},{\"key\":\"encryptedSecurityCode\",\"type\":\"cardToken\"},{\"key\":\"encryptedExpiryMonth\",\"type\":\"cardToken\"},{\"key\":\"encryptedExpiryYear\",\"type\":\"cardToken\"},{\"key\":\"holderName\",\"optional\":true,\"type\":\"text\"},{\"key\":\"telephoneNumber\",\"optional\":true,\"type\":\"text\"}],\"name\":\"ExpressPay\",\"supportsRecurring\":true,\"type\":\"cup\"},{\"details\":[{\"key\":\"encryptedCardNumber\",\"type\":\"cardToken\"},{\"key\":\"encryptedSecurityCode\",\"optional\":true,\"type\":\"cardToken\"},{\"key\":\"encryptedExpiryMonth\",\"optional\":true,\"type\":\"cardToken\"},{\"key\":\"encryptedExpiryYear\",\"optional\":true,\"type\":\"cardToken\"},{\"key\":\"encryptedPassword\",\"optional\":true,\"type\":\"cardToken\"},{\"key\":\"holderName\",\"optional\":true,\"type\":\"text\"}],\"name\":\"Givex\",\"supportsRecurring\":true,\"type\":\"givex\"},{\"name\":\"Pay now with Klarna.\",\"supportsRecurring\":true,\"type\":\"klarna_paynow\"},{\"details\":[{\"key\":\"encryptedCardNumber\",\"type\":\"cardToken\"},{\"key\":\"encryptedSecurityCode\",\"optional\":true,\"type\":\"cardToken\"},{\"key\":\"encryptedExpiryMonth\",\"optional\":true,\"type\":\"cardToken\"},{\"key\":\"encryptedExpiryYear\",\"optional\":true,\"type\":\"cardToken\"},{\"key\":\"encryptedPassword\",\"optional\":true,\"type\":\"cardToken\"},{\"key\":\"holderName\",\"optional\":true,\"type\":\"text\"}],\"name\":\"SVS\",\"supportsRecurring\":true,\"type\":\"svs\"}]}"
    }
  }
}
```

Pass the `getPaymentMethodsResponse` to your front end. You might use this in the next step to show which payment methods are available for the shopper.

> **Note** for Step 2: For a better performance `getPaymentMethodsResponse` could be cached by the merchant server.

## Step 3: Add Components to your payments form

Next, use the Adyen `Component` to render the payment method, and collect the required payment details from the shopper.

If you haven't created the payment forms already in your frontend, follow the official Adyen [Web Components integration guide](https://docs.adyen.com/checkout/components-web#step-2-add-components).

## Step 4: Make a payment

After the shopper submits their payment details or chooses to pay with a payment method that requires a redirection,
the Adyen Web Components will generate a `makePaymentRequest`.

**Preconditions:**

- `makePaymentRequest` must contain a unique payment `reference` value. The reference value cannot be duplicated in any commercetools payment and it's a required field by Adyen. The extension module uses `reference` value to set payment key, later it acts as a unique link between commercetools payment and Adyen payment(`merchantReference`). `Reference` may only contain alphanumeric characters, underscores, and hyphens and must have a minimum length of 2 characters and a maximum length of 80 characters.

- `payment.amountPlanned` CANNOT be changed if there is `makePayment` interface interaction present in the payment. The `amount` value in `makePaymentRequest` custom field must have the same value as `payment.amountPlanned`. This ensures eventual payment amount manipulations (i.e.: when [my-payments](https://docs.commercetools.com/http-api-projects-me-payments#my-payments) are used) for already initiated payment.

Make payment request generated from Adyen Web Components for credit card payment.

> Refer Adyen's [/payments](https://docs.adyen.com/api-explorer/#/PaymentSetupAndVerificationService/payments) request to check all possible request payload parameters.

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
  "returnUrl": "https://your-company.com/...",
  "merchantAccount": "YOUR_MERCHANT_ACCOUNT"
}
```

[Update commercetools payment](https://docs.commercetools.com/http-api-projects-payments#update-payment) with the request above.

```json
{
  "version": "PAYMENT_VERSION",
  "actions": [
    {
      "action": "setCustomField",
      "name": "makePaymentRequest",
      "value": "{\"amount\":{\"currency\":\"EUR\",\"value\":1000},\"reference\":\"YOUR_REFERENCE\",\"paymentMethod\":{\"type\":\"scheme\",\"encryptedCardNumber\":\"test_4111111111111111\",\"encryptedExpiryMonth\":\"test_03\",\"encryptedExpiryYear\":\"test_2030\",\"encryptedSecurityCode\":\"test_737\"},\"returnUrl\":\"https://your-company.com/...\",\"merchantAccount\":\"YOUR_MERCHANT_ACCOUNT\"}"
    }
  ]
}
```

If you are [creating a new commercetools payment](https://docs.commercetools.com/http-api-projects-payments#create-a-payment), the payment draft have to contain the `paymentMethodInfo.paymentInterface = ctp-adyen-integration` and `amountPlanned` value additional to the `makePaymentRequest` custom field, for example:

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
      "makePaymentRequest": "{\"amount\":{\"currency\":\"EUR\",\"value\":1000},\"reference\":\"YOUR_REFERENCE\",\"paymentMethod\":{\"type\":\"scheme\",\"encryptedCardNumber\":\"test_4111111111111111\",\"encryptedExpiryMonth\":\"test_03\",\"encryptedExpiryYear\":\"test_2030\",\"encryptedSecurityCode\":\"test_737\"},\"returnUrl\":\"https://your-company.com/...\",\"merchantAccount\":\"YOUR_MERCHANT_ACCOUNT\"}"
    }
  }
}
```

The commercetools payment `key` is set with the `reference` of the `makePaymentRequest` and response from Adyen is added to `makePaymentResponse` custom field.
The response contains information for the next steps of the payment process.
For details, consult the [Adyen documentation](https://docs.adyen.com/checkout/components-web#step-3-make-a-payment)

Example response from Adyen where the user has to be redirected to a payment provider page for further authentication:

```json
{
  "resultCode": "RedirectShopper",
  "action": {
    "paymentData": "Ab02b4c0!...",
    "paymentMethodType": "scheme",
    "url": "https://test.adyen.com/hpp/3d/validate.shtml",
    "data": {
      "MD": "aTZmV09...",
      "PaReq": "eNpVUtt...",
      "TermUrl": "https://your-company.com/..."
    },
    "method": "POST",
    "type": "redirect"
  },
  "details": [
    {
      "key": "MD",
      "type": "text"
    },
    {
      "key": "PaRes",
      "type": "text"
    }
  ],
  "paymentData": "Ab02b4c0!...",
  "redirect": {
    "data": {
      "PaReq": "eNpVUtt...",
      "TermUrl": "https://your-company.com/...",
      "MD": "aTZmV09..."
    },
    "method": "POST",
    "url": "https://test.adyen.com/hpp/3d/validate.shtml"
  }
}
```

A commercetools payment example with `makePaymentResponse` field with the response above:

```json
{
  "custom": {
    "type": {
      "typeId": "type",
      "key": "ctp-adyen-integration-web-components-payment-type"
    },
    "fields": {
      "makePaymentRequest": "{\"amount\":{\"currency\":\"EUR\",\"value\":1000},\"reference\":\"YOUR_REFERENCE\",\"paymentMethod\":{\"type\":\"scheme\",\"encryptedCardNumber\":\"test_4111111111111111\",\"encryptedExpiryMonth\":\"test_03\",\"encryptedExpiryYear\":\"test_2030\",\"encryptedSecurityCode\":\"test_737\"},\"returnUrl\":\"https://your-company.com/...\",\"merchantAccount\":\"YOUR_MERCHANT_ACCOUNT\"}",
      "makePaymentResponse": "{\"resultCode\":\"RedirectShopper\",\"action\":{\"paymentData\":\"Ab02b4c0!...\",\"paymentMethodType\":\"scheme\",\"url\":\"https://test.adyen.com/hpp/3d/validate.shtml\",\"data\":{\"MD\":\"aTZmV09...\",\"PaReq\":\"eNpVUtt...\",\"TermUrl\":\"https://your-company.com/...\"},\"method\":\"POST\",\"type\":\"redirect\"},\"details\":[{\"key\":\"MD\",\"type\":\"text\"},{\"key\":\"PaRes\",\"type\":\"text\"}],\"paymentData\":\"Ab02b4c0!...\",\"redirect\":{\"data\":{\"PaReq\":\"eNpVUtt...\",\"TermUrl\":\"https://your-company.com/...\",\"MD\":\"aTZmV09...\"},\"method\":\"POST\",\"url\":\"https://test.adyen.com/hpp/3d/validate.shtml\"}}"
    }
  }
}
```

Response from Adyen for the case where you can present the payment result to your shopper.
See [Adyen documentation](https://docs.adyen.com/checkout/components-web#step-6-present-payment-result) for more information how to present the results.

```json
{
  "pspReference": "853592567856061C",
  "resultCode": "Authorised",
  "amount": {
    "currency": "EUR",
    "value": 1000
  },
  "merchantReference": "YOUR_REFERENCE"
}
```

A commercetools payment with `makePaymentResponse` field with the response above.
Notice that a transaction is added to the payment. The transaction is of type `Authorization`
and has `amount` taken from `amountPlanned`. `interactionId` is matching the `makePaymentResponse`

```json
{
  "amountPlanned": {
    "type": "centPrecision",
    "currencyCode": "EUR",
    "centAmount": 1000,
    "fractionDigits": 2
  },
  "custom": {
    "type": {
      "typeId": "type",
      "key": "ctp-adyen-integration-web-components-payment-type"
    },
    "fields": {
      "makePaymentRequest": "{\"amount\":{\"currency\":\"EUR\",\"value\":1000},\"reference\":\"YOUR_REFERENCE\",\"paymentMethod\":{\"type\":\"scheme\",\"encryptedCardNumber\":\"test_4111111111111111\",\"encryptedExpiryMonth\":\"test_03\",\"encryptedExpiryYear\":\"test_2030\",\"encryptedSecurityCode\":\"test_737\"},\"returnUrl\":\"https://your-company.com/...\",\"merchantAccount\":\"YOUR_MERCHANT_ACCOUNT\"}",
      "makePaymentResponse": "{\"pspReference\":\"853592567856061C\",\"resultCode\":\"Authorised\",\"amount\":{\"currency\":\"EUR\",\"value\":1000},\"merchantReference\":\"YOUR_REFERENCE\"}"
    }
  },
  "transactions": [
    {
      "id": "eab650fd-8616-471b-b884-eef641b4f169",
      "type": "Authorization",
      "amount": {
        "type": "centPrecision",
        "currencyCode": "EUR",
        "centAmount": 1000,
        "fractionDigits": 2
      },
      "interactionId": "853592567856061C",
      "state": "Success"
    }
  ]
}
```

#### Klarna payment

For Klarna payment it is necessary to provide [line item details](https://docs.adyen.com/api-explorer/#/PaymentSetupAndVerificationService/latest/payments__reqParam_lineItems) in `makePaymentRequest`.
The extension module can add the line item details for you if [the payment is added to a cart](https://docs.commercetools.com/http-api-projects-carts#add-payment).

Using Adyen Web Components, create `makePaymentRequest` **WITHOUT** `lineItems` attribute.

```json
{
  "merchantAccount": "YOUR_MERCHANT_ACCOUNT",
  "reference": "YOUR_REFERENCE",
  "paymentMethod": {
    "type": "klarna"
  },
  "amount": {
    "currency": "EUR",
    "value": "1000"
  },
  "shopperLocale": "en_US",
  "countryCode": "SE",
  "shopperEmail": "youremail@email.com",
  "shopperName": {
    "firstName": "Testperson-se",
    "gender": "UNKNOWN",
    "lastName": "Approved"
  },
  "shopperReference": "YOUR_UNIQUE_SHOPPER_ID_IOfW3k9G2PvXFu2j",
  "billingAddress": {
    "city": "Ankeborg",
    "country": "SE",
    "houseNumberOrName": "1",
    "postalCode": "12345",
    "street": "Stargatan"
  },
  "returnUrl": "https://www.your-company.com/..."
}
```

[Update commercetools payment](https://docs.commercetools.com/http-api-projects-payments#update-payment) with the request above.

```json
{
  "version": "PAYMENT_VERSION",
  "actions": [
    {
      "action": "setCustomField",
      "name": "makePaymentRequest",
      "value": "{\"merchantAccount\":\"YOUR_MERCHANT_ACCOUNT\",\"reference\":\"YOUR_REFERENCE\",\"paymentMethod\":{\"type\":\"klarna\"},\"amount\":{\"currency\":\"SEK\",\"value\":\"1000\"},\"shopperLocale\":\"en_US\",\"countryCode\":\"SE\",\"shopperEmail\":\"youremail@email.com\",\"shopperName\":{\"firstName\":\"Testperson-se\",\"gender\":\"UNKNOWN\",\"lastName\":\"Approved\"},\"shopperReference\":\"YOUR_UNIQUE_SHOPPER_ID_IOfW3k9G2PvXFu2j\",\"billingAddress\":{\"city\":\"Ankeborg\",\"country\":\"SE\",\"houseNumberOrName\":\"1\",\"postalCode\":\"12345\",\"street\":\"Stargatan\"},\"returnUrl\":\"https://www.your-company.com/...\"}"
    }
  ]
}
```

Extension module will add line items to your `makePaymentRequest`

```json
{
  "merchantAccount": "YOUR_MERCHANT_ACCOUNT",
  "reference": "YOUR_REFERENCE",
  "paymentMethod": {
    "type": "klarna"
  },
  "amount": {
    "currency": "EUR",
    "value": "1000"
  },
  "shopperLocale": "en_US",
  "countryCode": "SE",
  "shopperEmail": "youremail@email.com",
  "shopperName": {
    "firstName": "Testperson-se",
    "gender": "UNKNOWN",
    "lastName": "Approved"
  },
  "shopperReference": "YOUR_UNIQUE_SHOPPER_ID_IOfW3k9G2PvXFu2j",
  "billingAddress": {
    "city": "Ankeborg",
    "country": "SE",
    "houseNumberOrName": "1",
    "postalCode": "12345",
    "street": "Stargatan"
  },
  "returnUrl": "https://www.your-company.com/...",
  "lineItems": [
    {
      "quantity": "1",
      "amountExcludingTax": "331",
      "taxPercentage": "2100",
      "description": "Shoes",
      "id": "Item #1",
      "taxAmount": "69",
      "amountIncludingTax": "400"
    },
    {
      "quantity": "2",
      "amountExcludingTax": "248",
      "taxPercentage": "2100",
      "description": "Socks",
      "id": "Item #2",
      "taxAmount": "52",
      "amountIncludingTax": "300"
    }
  ]
}
```

By default, the extension module will populate `lineItems` for you but in case you want to define your own values include `lineItems` in your `makePaymentRequest`.

## Step 5: Submit additional payment details

If the shopper performed additional action (e.g. redirect) in the previous step,
you need to make `submitAdditionalPaymentDetailsRequest` to either complete the payment, or to check the payment result.

Collect information from the previous step and [update commercetools payment](https://docs.commercetools.com/http-api-projects-payments#update-payment) with `submitAdditionalPaymentDetailsRequest` custom field.
The information is available either in `state.data.details` from the `onAdditionalDetails` event or, for redirects, the parameters you received when the shopper was redirected back to your website.

> Refer Adyen's [/payments/details](https://docs.adyen.com/api-explorer/#/PaymentSetupAndVerificationService/payments/details) request to check all possible request payload parameters.

```json
{
  "version": "PAYMENT_VERSION",
  "actions": [
    {
      "action": "setCustomField",
      "name": "submitAdditionalPaymentDetailsRequest",
      "value": "{\"details\":{\"redirectResult\":\"Ab02b4c0!...\"}}"
    }
  ]
}
```

Extension module will extend `submitAdditionalPaymentDetailsRequest` with `paymentData` attribute if the attribute is missing.
In this case, `paymentData` will be taken from the previous `makePaymentRequest`.

After update, you will receive `submitAdditionalPaymentDetailsResponse` in the returned commercetools payment.
The next steps depend on the existence of an action object within `submitAdditionalPaymentDetailsResponse`.

If you received an action object, [pass the action object to your front end](https://docs.adyen.com/checkout/components-web/#step-4-additional-front-end) and perform Step 4 again.
Submit additional payment details response from Adyen for the case where you need to pass the action object to your front end:

```json
{
  "resultCode": "ChallengeShopper",
  "action": {
    "paymentData": "Ab02b4c0!...",
    "paymentMethodType": "scheme",
    "token": "eyJhY3...",
    "type": "threeDS2Challenge"
  },
  "authentication": {
    "threeds2.challengeToken": "eyJhY3..."
  },
  "details": [
    {
      "key": "threeds2.challengeResult",
      "type": "text"
    }
  ],
  "paymentData": "Ab02b4c0!..."
}
```

A commercetools example payment with `submitAdditionalPaymentDetailsResponse` field with the response above:

```json
{
  "custom": {
    "type": {
      "typeId": "type",
      "key": "ctp-adyen-integration-web-components-payment-type"
    },
    "fields": {
      "submitPaymentDetailsRequest": "{\"details\":{\"redirectResult\":\"Ab02b4c0!...\"}}",
      "submitAdditionalPaymentDetailsResponse": "{\"resultCode\":\"ChallengeShopper\",\"action\":{\"paymentData\":\"Ab02b4c0!...\",\"paymentMethodType\":\"scheme\",\"token\":\"eyJhY3...\",\"type\":\"threeDS2Challenge\"},\"authentication\":{\"threeds2.challengeToken\":\"eyJhY3...\"},\"details\":[{\"key\":\"threeds2.challengeResult\",\"type\":\"text\"}],\"paymentData\":\"Ab02b4c0!...\"}"
    }
  }
}
```

If you received an action object you need to repeat `submitAdditionalPaymentDetailsRequest` step. In order to do so remove the existing `submitAdditionalPaymentDetailsResponse` custom field. This can be done in a single payment update request as follow:

```json
{
  "version": "PAYMENT_VERSION",
  "actions": [
    {
      "action": "setCustomField",
      "name": "submitAdditionalPaymentDetailsRequest",
      "value": "{\"details\":{\"threeds2.challengeResult\":\"eyJ0cmFuc1...\"}}"
    },
    {
      "action": "setCustomField",
      "name": "submitAdditionalPaymentDetailsResponse"
    }
  ]
}
```

If you did not get an action object, you can present the payment result to your shopper.
See [Adyen documentation](https://docs.adyen.com/checkout/components-web#step-6-present-payment-result) for more information how to present the results.
Submit additional payment details response from Adyen for the case where you can present the result:

```json
{
  "pspReference": "853592567856061C",
  "resultCode": "Authorised",
  "amount": {
    "currency": "EUR",
    "value": 1000
  },
  "merchantReference": "YOUR_REFERENCE"
}
```

A commercetools example payment with `submitAdditionalPaymentDetailsResponse` field with the response above.
Notice that a transaction is added to the payment. The transaction is of type `Authorization`
and has `amount` taken from `amountPlanned`. `interactionId` is matching the `makePaymentResponse`

```json
{
  "amountPlanned": {
    "type": "centPrecision",
    "currencyCode": "EUR",
    "centAmount": 1000,
    "fractionDigits": 2
  },
  "custom": {
    "type": {
      "typeId": "type",
      "key": "ctp-adyen-integration-web-components-payment-type"
    },
    "fields": {
      "submitPaymentDetailsRequest": "{\"details\":{\"redirectResult\":\"Ab02b4c0!...\"}}",
      "submitAdditionalPaymentDetailsResponse": "{\"pspReference\":\"853592567856061C\",\"resultCode\":\"Authorised\",\"amount\":{\"currency\":\"EUR\",\"value\":1000},\"merchantReference\":\"YOUR_REFERENCE\"}"
    }
  },
  "transactions": [
    {
      "id": "eab650fd-8616-471b-b884-eef641b4f169",
      "type": "Authorization",
      "amount": {
        "type": "centPrecision",
        "currencyCode": "EUR",
        "centAmount": 1000,
        "fractionDigits": 2
      },
      "interactionId": "853592567856061C",
      "state": "Success"
    }
  ]
}
```

## Step 6: Capture payment (required for Klarna)

All Klarna payments [have to be manually captured](https://docs.adyen.com/payment-methods/klarna/web-component#capture) within 28 days after authorisation, even if you have enabled automatic capture on your Adyen merchant account.
Refer to [Manual Capture](ManualCapture.md) guide to see how it can be done.

## Error handling

In case you encounter errors in your integration, refer to the following:

### Extension module errors

If you receive a `non-HTTP 200 response`, use the commercetools payment `interface interactions` to troubleshoot the response.

Interface interactions can represent a `request` sent to Adyen, a `response`, or a `notification` received from Adyen.
Some interactions may result in a transaction. If so, the interactionId in the payment transaction will be set to match the `pspReference` of the Adyen API.

### Adyen payment refusals

If you receive an HTTP 200 response with an Error or Refused resultCode, check the refusal reason and, if possible, modify your request.

Check the following table to see the mapping of Adyen [result codes](https://docs.adyen.com/development-resources/response-handling#error-codes-types) to commercetools [transaction state](https://docs.commercetools.com/http-api-projects-payments#transactionstate)
|Adyen result code| The commercetools transaction (transaction state)
| --- | --- |
| Authorised| Authorization (Success)|
| Refused| Authorization (Failure)|
| Error| Authorization (Failure)|

### Shopper successfully paid but `redirectUrl` was not reached

In some payment redirect cases, there might be a valid payment but no order as shopper did not reach the shop's `redirectUrl`.
For example, after successfully issued payment shopper loses internet connection or accidentally closes the tab.
In this case [Notification module](../../notification) will receive asynchronously a notification from Adyen with payment confirmation which will result in a transaction creation or transaction state change.
An optional usage of scheduled [commercetools-payment-to-order-processor](https://github.com/commercetools/commercetools-payment-to-order-processor) job ensures that for every successful payment
an order can still be asynchronously created.

### Shopper tries to pay a different amount than the actual order amount

For redirect payments payment amount is bound to `redirectUrl`.
After redirect and before the actual finalization of the payment at the provider's page, the shopper is still able to change the cart's amount within the second tab.
If shopper decides to change cart's amount within the second tab and finalize payment within the first tab, then according to payment amount validation an error
will be shown and order creation must be declined. In such a case, it might be reasonable to [cancel or refund](#cancel-or-refund) the invalid payment.

## Test and go live

Before you go live please follow [steps](https://docs.adyen.com/checkout/components-web/#testing-your-integration) described by Adyen.

Additionally, follow the official Adyen [integration checklist](https://docs.adyen.com/development-resources/integration-checklist).

# Manual Capture

By default, payments are captured immediately (or with [delay](https://docs.adyen.com/point-of-sale/capturing-payments/delayed-capture#set-up-delayed-capture)) after authorisation. For payment methods that support separate authorization and capture, you also have the option to capture the payment later, for example only after the goods have been shipped. This also allows you to cancel the payment/authorization.

If you need to explicitly request a capture for each payment please follow our [manual capture documentation](./ManualCapture.md).

# Cancel or refund

If you want to return the funds to your shopper, use either Cancel or Refund functionalities.

This will either:

- [**Cancel**](CancelPayment.md) - cancel the authorisation on an uncaptured payment(full payment).
- [**Refund**](Refund.md) - (partially) refund a payment back to the shopper.

# Bad Practices

- **Never delete or un-assign** created payment objects during checkout from the cart. If required — clean up unused/obsolete payment objects by another asynchronous process instead.
