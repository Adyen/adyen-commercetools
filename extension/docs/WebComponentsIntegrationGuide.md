# Integration Guide

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Web Components integration guide](#web-components-integration-guide)
  - [How it works](#how-it-works)
  - [Before you begin](#before-you-begin)
  - [Step 1: commercetools checkout validations](#step-1-commercetools-checkout-validations)
    - [Validate cart state](#validate-cart-state)
    - [Recalculate cart](#recalculate-cart)
    - [Validate payment](#validate-payment)
    - [Validate payment transaction](#validate-payment-transaction)
  - [Step 2: Creating a commercetools payment](#step-2-creating-a-commercetools-payment)
  - [Step 3: Get available payment methods (Optional)](#step-3-get-available-payment-methods-optional)
  - [Step 4: Add Components to your payments form](#step-4-add-components-to-your-payments-form)
  - [Step 5: Make a payment](#step-5-make-a-payment)
    - [Response](#response)
      - [Authorised Response](#authorised-response)
      - [Action Response](#action-response)
    - [Adding cart and product informations (lineItems) to the request](#adding-cart-and-product-informations-lineitems-to-the-request)
  - [Step 6: Submit additional payment details](#step-6-submit-additional-payment-details)
    - [Response](#response-1)
      - [Authorised Response](#authorised-response-1)
      - [Action Response](#action-response-1)
  - [Error handling](#error-handling)
    - [Extension module errors](#extension-module-errors)
    - [Adyen payment refusals](#adyen-payment-refusals)
    - [Shopper successfully paid but `redirectUrl` was not reached](#shopper-successfully-paid-but-redirecturl-was-not-reached)
    - [Shopper tries to pay a different amount than the actual order amount](#shopper-tries-to-pay-a-different-amount-than-the-actual-order-amount)
  - [Test and go live](#test-and-go-live)
- [Manual Capture](#manual-capture)
- [Cancel or refund](#cancel-or-refund)
- [Restore](#restore)
- [Multi-tenancy](#multi-tenancy)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# Web Components integration guide

Terms used in this guide:

- **Shopper** - a person that's using the shop.
- **Browser** - frontend part of the checkout UI (webshop).
- **Merchant server** - backend part of the checkout.
- **Extension module** - [extension module](https://github.com/commercetools/commercetools-adyen-integration#extension-module) configured as [commercetools HTTP API Extensions](https://docs.commercetools.com/http-api-projects-api-extensions) is handling checkout steps by intercepting payment modifications and communicating with Adyen API.
- **Notification module** - [notification module](https://github.com/commercetools/commercetools-adyen-integration#notification-module) processes asynchronous notifications from Adyen and stores payment state changes in commercetools payment object.

The following diagram shows checkout integration flow based on [Adyen Web Components](https://docs.adyen.com/online-payments/web-components/integrated-before-5-0-0).

![Flow](https://user-images.githubusercontent.com/803826/98081637-c467a380-1e77-11eb-93ed-003f7e68b59a.png)

## How it works

On this page we describe the checkout integration steps between the extension module and Adyen Web Components:

- [Step 1](#step-1-commercetools-checkout-validations) : Execute required checkout validations.
- [Step 2](#step-2-creating-a-commercetools-payment) : Create the commercetools payment object.
- [Step 3 - Optional](#step-3-get-available-payment-methods-optional) : Set `getPaymentMethodsRequest` custom field to commercetools payment to get the list of payment methods available for the checkout.
- [Step 4](#step-4-add-components-to-your-payments-form) : Add Adyen Web Component to your checkout payments form.
- [Step 5](#step-5-make-a-payment) : Submit a payment request by setting `makePaymentRequest` payment custom field with the payment data returned by the Adyen web component.
- [Step 6](#step-6-submit-additional-payment-details) : Set `submitAdditionalPaymentDetailsRequest ` custom field to commercetools payment to submit additional payment details.

## Before you begin

In order to make the extension module up and running, follow our [how to run guide](./HowToRun.md).

## Step 1: commercetools checkout validations

The merchant server should execute the following validations:

1. On each checkout step [validate cart state](#validate-cart-state)
1. Before starting a new payment process make sure there are no paid payments on the cart already:
   - [Recalculate cart](#recalculate-cart)
   - [Validate payment](#validate-payment)
   - [Validate payment transaction](#validate-payment-transaction)

If all the above validations passed then the order can be created right away and the order confirmation page shown.
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

## Step 2: Creating a commercetools payment

Before the actual payment process, commercetools payment resource needs to be created by the merchant server.

In the commercetools platform, payment represents just a container of the current state of receiving and/or refunding money.
The actual financial process is performed behind the scenes by the extension module which processes commercetools payment payload supplied by the merchant server and exchanges it with Adyen API.

The commercetools [payment](https://docs.commercetools.com/api/projects/payments#payment) does not contain by default all the required Adyen specific fields, so those have to be set as custom fields via a payment method-specific payment type.

Specifying the **required** fields:

| Field name                              | Value                                                                                                                      |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `amountPlanned`                         | How much money this payment intends to receive from the customer. The value usually matches the cart or order gross total. |
| `paymentMethodInfo.paymentInterface`    | `ctp-adyen-integration`                                                                                                    |
| `custom.type.key`                       | `ctp-adyen-integration-web-components-payment-type`                                                                        |
| `custom.fields.adyenMerchantAccount`    | Adyen merchant account as a custom field called `adyenMerchantAccount`.                                                    |
| `custom.fields.commercetoolsProjectKey` | commercetools project key as a custom field called `commercetoolsProjectKey`.                                              |

In case of the absence of the required fields above, payment creation **will be rejected**.

Here's an example of how you would create a commercetools payment draft from scratch:

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
      "commercetoolsProjectKey": "YOUR_COMMERCETOOLS_PROJECT_KEY"
    }
  }
}
```

Create a [payment](https://docs.commercetools.com/http-api-projects-payments#create-a-payment) with commercetools API.

After successful payment creation always [add](https://docs.commercetools.com/api/projects/carts#add-payment) it to the appropriate cart.

## Step 3: Get available payment methods (Optional)

When your shopper is ready to pay, you may request through the integration a list of the available payment methods based on the transaction context (like amount, country, and currency) and use it to render web-components based Adyen payment input forms.

> This step is optional but Adyen recommends to use it so that merchant server can always serve latest list of payment methods. During checkout you might also want to cache the list instead of requesting it every time a customer attempts to pay.

To get available payment methods via our integration, you need to set the `getPaymentMethodsRequest` custom field to your existing commercetools payment or create a payment right away with the custom fieldset.

> If you don't have a payment object, check [creating a new commercetools payment](#step-2-creating-a-commercetools-payment) and set `getPaymentMethodsRequest` custom field together with other required fields.

Here's an example of the `getPaymentMethodsRequest` custom field value for a German shopper and payment amount of `10 EUR`:

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

> Refer Adyen's [/paymentMethods](https://docs.adyen.com/api-explorer/#/PaymentSetupAndVerificationService/paymentMethods) request to check all possible request payload parameters.

<details>
  <summary>The commercetools payment representation example with getPaymentMethodsRequest. Click to expand.</summary>
    
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
      "getPaymentMethodsRequest": "{\"countryCode\":\"DE\",\"shopperLocale\":\"de-DE\",\"amount\":{\"currency\":\"EUR\",\"value\":1000}}"
    }
  }
}
```
</details>

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

Pass the `getPaymentMethodsResponse` custom field value to your front end. You might use this in the next step to show which payment methods are available for the shopper.

<details>
  <summary>The commercetools payment representation example with response. Click to expand.</summary>
    
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
      "getPaymentMethodsRequest": "{\"countryCode\":\"DE\",\"shopperLocale\":\"de-DE\",\"amount\":{\"currency\":\"EUR\",\"value\":1000}}",
      "getPaymentMethodsResponse": "{\"paymentMethods\":[{\"configuration\":{\"intent\":\"capture\"},\"name\":\"PayPal\",\"type\":\"paypal\"},{\"brands\":[\"visa\",\"mc\",\"amex\",\"maestro\",\"uatp\",\"cup\",\"diners\",\"discover\",\"hipercard\",\"jcb\"],\"details\":[{\"key\":\"encryptedCardNumber\",\"type\":\"cardToken\"},{\"key\":\"encryptedSecurityCode\",\"type\":\"cardToken\"},{\"key\":\"encryptedExpiryMonth\",\"type\":\"cardToken\"},{\"key\":\"encryptedExpiryYear\",\"type\":\"cardToken\"},{\"key\":\"holderName\",\"optional\":true,\"type\":\"text\"}],\"name\":\"Kreditkarte\",\"type\":\"scheme\"},{\"name\":\"Sofort.\",\"type\":\"directEbanking\"},{\"details\":[{\"key\":\"sepa.ownerName\",\"type\":\"text\"},{\"key\":\"sepa.ibanNumber\",\"type\":\"text\"}],\"name\":\"SEPA Lastschrift\",\"type\":\"sepadirectdebit\"},{\"name\":\"Rechnung mit Klarna.\",\"type\":\"klarna\"},{\"name\":\"GiroPay\",\"type\":\"giropay\"},{\"name\":\"Ratenkauf mit Klarna.\",\"type\":\"klarna_account\"},{\"brand\":\"givex\",\"details\":[{\"key\":\"encryptedCardNumber\",\"type\":\"cardToken\"},{\"key\":\"encryptedSecurityCode\",\"optional\":true,\"type\":\"cardToken\"},{\"key\":\"encryptedExpiryMonth\",\"optional\":true,\"type\":\"cardToken\"},{\"key\":\"encryptedExpiryYear\",\"optional\":true,\"type\":\"cardToken\"},{\"key\":\"encryptedPassword\",\"optional\":true,\"type\":\"cardToken\"},{\"key\":\"holderName\",\"optional\":true,\"type\":\"text\"}],\"name\":\"Givex\",\"type\":\"giftcard\"},{\"name\":\"Sofort bezahlen mit Klarna.\",\"type\":\"klarna_paynow\"},{\"brand\":\"svs\",\"details\":[{\"key\":\"encryptedCardNumber\",\"type\":\"cardToken\"},{\"key\":\"encryptedSecurityCode\",\"optional\":true,\"type\":\"cardToken\"},{\"key\":\"encryptedExpiryMonth\",\"optional\":true,\"type\":\"cardToken\"},{\"key\":\"encryptedExpiryYear\",\"optional\":true,\"type\":\"cardToken\"},{\"key\":\"encryptedPassword\",\"optional\":true,\"type\":\"cardToken\"},{\"key\":\"holderName\",\"optional\":true,\"type\":\"text\"}],\"name\":\"SVS\",\"type\":\"giftcard\"}]}"
    }
  }
}
```
</details>

## Step 4: Add Components to your payments form

Next, use the Adyen Web Components to render the payment method, and collect the required payment details from the shopper.

If you haven't created the payment forms already in your frontend, follow the official Adyen [Web Components integration guide](https://docs.adyen.com/online-payments/web-components/integrated-before-5-0-0#step-2-add-components).

## Step 5: Make a payment

When a shopper selects a payment method, enters payment details into the web component form, and then submits payment with a `Pay` button, the Adyen web component will trigger an `onSubmit` component event with a generated "make payment" JSON data that the merchant server needs to pass to the commercetools payment for further processing.

> For details, consult the [Adyen documentation](https://docs.adyen.com/online-payments/web-components/integrated-before-5-0-0#step-3-make-a-payment)

To make payment via our integration, you need to set the `makePaymentRequest` custom field to existing commercetools payment with generated component data from the Adyen web component.

> If you don't have a payment object, check [creating a new commercetools payment](#step-2-creating-a-commercetools-payment) and set `makePaymentRequest` custom field together with other required fields.

**Preconditions**

- `makePaymentRequest` must contain a unique payment `reference` value. The reference value cannot be duplicated in any commercetools payment and it's a required field by Adyen. The extension module uses the `reference` value to set the payment key, later it acts as a unique link between commercetools payment and Adyen payment(`merchantReference`). `Reference` may only contain alphanumeric characters, underscores and hyphens and must have a minimum length of 2 characters and a maximum length of 80 characters.
- `payment.amountPlanned` can not be changed if there is a `makePayment` interface interaction present in the commercetools payment object. The `amount` value in `makePaymentRequest` custom field must have the same value as `payment.amountPlanned`. This ensures eventual payment amount manipulations (i.e.: when [my-payments](https://docs.commercetools.com/http-api-projects-me-payments#my-payments) are used) for already initiated payment. In case `amountPlanned` needs to be changed and an existing commercetools payment resource with interface interaction of type `makePayment` exists, please create a new commercetools payment instead of modifying the existing one.

**Important**

In this integration document our Adyen payment request examples are trimmed to minimum. Depending on your requirements you might want to include other Adyen parameters such as [add risk management fields](https://docs.adyen.com/risk-management/configure-standard-risk-rules/required-risk-field-reference), [activate 3D Secure 2](https://docs.adyen.com/online-payments/3d-secure/native-3ds2/web-component#make-a-payment) or [allow recurring payments](https://docs.adyen.com/payment-methods/cards/web-component#create-a-token).
Please find all the possible parameters in the `Web Components` section of the desired payment method listed in the navigation [here](https://docs.adyen.com/payment-methods).

Here's an example of the `makePaymentRequest` custom field value for 3D Secure 2 credit card payment along with the generated Adyen Web Components data:

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
  "merchantAccount": "YOUR_MERCHANT_ACCOUNT"
}
```

An example of payment [setCustomField](https://docs.commercetools.com/http-api-projects-payments#update-payment) action with the generated component data above.

```json
{
  "version": "PAYMENT_VERSION",
  "actions": [
    {
      "action": "setCustomField",
      "name": "makePaymentRequest",
      "value": "{\"amount\":{\"currency\":\"EUR\",\"value\":1000},\"reference\":\"YOUR_REFERENCE\",\"paymentMethod\":{\"type\":\"scheme\",\"encryptedCardNumber\":\"test_4111111111111111\",\"encryptedExpiryMonth\":\"test_03\",\"encryptedExpiryYear\":\"test_2030\",\"encryptedSecurityCode\":\"test_737\"}, \"additionalData\":{\"allow3DS2\":true}, \"channel\":\"Web\", \"origin\":\"https://your-company.com\", \"returnUrl\":\"https://your-company.com/...\",\"merchantAccount\":\"YOUR_MERCHANT_ACCOUNT\"}"
    }
  ]
}
```

<details>
  <summary>The commercetools payment representation example with makePaymentRequest request. Click to expand.</summary>
    
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
      "makePaymentRequest": "{\"amount\":{\"currency\":\"EUR\",\"value\":1000},\"reference\":\"YOUR_REFERENCE\",\"paymentMethod\":{\"type\":\"scheme\",\"encryptedCardNumber\":\"test_4111111111111111\",\"encryptedExpiryMonth\":\"test_03\",\"encryptedExpiryYear\":\"test_2030\",\"encryptedSecurityCode\":\"test_737\"}, \"additionalData\":{\"allow3DS2\":true}, \"channel\":\"Web\", \"origin\":\"https://your-company.com\", \"returnUrl\":\"https://your-company.com/...\",\"merchantAccount\":\"YOUR_MERCHANT_ACCOUNT\"}"
    }
  }
}
```
</details>

> For the sake of readability, the field [`applicationInfo`](https://docs.adyen.com/development-resources/building-adyen-solutions#building-a-plugin) is omitted from all the examples in this document. In real requests, [`applicationInfo`](https://docs.adyen.com/development-resources/building-adyen-solutions#building-a-plugin) is always added.

### Response

The payment response contains information for the next steps of the payment process. On a successful payment response, commercetools payment `key` is set with the `reference` of the `makePaymentRequest`, and the response from Adyen is set to `makePaymentResponse` custom field.

Next steps depend on whether the `makePaymentResponse` custom field contains an action object.

> Refer our [error handling](#error-handling) section, in case you encounter errors in your integration.

#### Authorised Response

For some payment methods (e.g. Visa, Mastercard, and SEPA Direct Debits) you'll get a final state in the `resultCode` (e.g. Authorised or Refused).

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

<details>
 <summary> A commercetools payment with makePaymentResponse field with the response above. Click to expand. </summary>

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
      "adyenMerchantAccount": "YOUR_MERCHANT_ACCOUNT",
      "commercetoolsProjectKey": "YOUR_COMMERCETOOLS_PROJECT_KEY",
      "makePaymentRequest": "{\"amount\":{\"currency\":\"EUR\",\"value\":1000},\"reference\":\"YOUR_REFERENCE\",\"paymentMethod\":{\"type\":\"scheme\",\"encryptedCardNumber\":\"test_4111111111111111\",\"encryptedExpiryMonth\":\"test_03\",\"encryptedExpiryYear\":\"test_2030\",\"encryptedSecurityCode\":\"test_737\"}, \"additionalData\":{\"allow3DS2\":true}, \"channel\":\"Web\", \"origin\":\"https://your-company.com\", \"returnUrl\":\"https://your-company.com/...\",\"merchantAccount\":\"YOUR_MERCHANT_ACCOUNT\"}",
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

</details>

Notice that on an `Authorised` (successful) result, the integration will automatically add a transaction to the commercetools payment. The transaction will be of type `Authorization`, its' `amount` will match the `amountPlanned` and `interactionId` will be matching the unique Adyen's `pspReference` from `makePaymentResponse`.

> See [Adyen documentation](https://docs.adyen.com/online-payments/web-components/integrated-before-5-0-0#step-6-present-payment-result) for more information how to present the results.

#### Action Response

Some payment methods require additional action from the shopper such as: to scan a QR code, to authenticate a payment with 3D Secure, or to log in to their bank's website to complete the payment.
In this case you'll receive an `action` object (e.g. redirect, threeDS2, qrCode etc).

Here an example response from Adyen where the user has to be redirected to a payment provider page:

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

Pass the action object to your front end. The Adyen web component uses this to handle the required action.

> See [Adyen documentation](https://docs.adyen.com/online-payments/web-components/integrated-before-5-0-0#step-4-additional-front-end) for more information how to perform additional front end actions.

### Adding cart and product informations (lineItems) to the request

For some payment methods, it is necessary to provide [line item details](https://docs.adyen.com/api-explorer/#/PaymentSetupAndVerificationService/latest/payments__reqParam_lineItems) within the `makePaymentRequest`.

Extension module can generate the line item automatically, but you need to do following steps:

- The commercetools payment [referenced in the commercetools cart](https://docs.commercetools.com/http-api-projects-carts#add-payment).
- Either `addCommercetoolsLineItems` property set to`true` within the `makePaymentRequest` or `addCommercetoolsLineItems` flag set to `true` within your extension [configuration](./HowToRun.md#other-configurations).
  > In case you would like to override the generation of the lineItems please provide within the `makePaymentRequest` own `lineItems` data.

Here's an example of the `makePaymentRequest` **WITHOUT** `lineItems` and `addCommercetoolsLineItems` property set to true.

```json
{
  "merchantAccount": "YOUR_MERCHANT_ACCOUNT",
  "reference": "YOUR_REFERENCE",
  "paymentMethod": {
    "type": "YOUR_PAYMENT_METHOD"
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
  "addCommercetoolsLineItems": true
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

<details>
<summary>Extension module will add line items to your makePaymentRequest. Click to expand.</summary>

```json
{
  "merchantAccount": "YOUR_MERCHANT_ACCOUNT",
  "reference": "YOUR_REFERENCE",
  "paymentMethod": {
    "type": "YOUR_PAYMENT_METHOD"
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

</details>

By default, the extension module will populate `lineItems` for you but in case you want to define your own values include `lineItems` in your `makePaymentRequest`.

## Step 6: Submit additional payment details

If the shopper performed an additional action (e.g. redirect, threeDS2) in the [Step-5](#step-5-make-a-payment), you need to make `submitAdditionalPaymentDetailsRequest` in order to complete the payment.

Pass the generated component data to your merchant server, the data is available either in `state.data` from the `onAdditionalDetails` event or, for redirects, the parameters you received when the shopper redirected back to your website.

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

> Refer Adyen's [/payments/details](https://docs.adyen.com/api-explorer/#/PaymentSetupAndVerificationService/payments/details) request to check all possible request payload parameters.

### Response

After update, you will receive `submitAdditionalPaymentDetailsResponse` in the returned commercetools payment.

Depending on the payment result, you receive a response containing:

- resultCode: Provides information about the result of the request.
- pspReference: Our unique identifier for the transaction.
- action: If you receive this object, you need to perform [Step-5](#step-5-make-a-payment) again.

> Refer our [error handling](#error-handling) section, in case you encounter errors in your integration.

#### Authorised Response

If the response does not contain an action object, you can present the payment result to your shopper.

> See [Adyen documentation](https://docs.adyen.com/online-payments/web-components/integrated-before-5-0-0#step-6-present-payment-result) for more information how to present the results.

<details>
<summary>A commercetools example payment with submitAdditionalPaymentDetailsResponse field. Click to expand.</summary>

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
      "adyenMerchantAccount": "YOUR_MERCHANT_ACCOUNT",
      "commercetoolsProjectKey": "YOUR_COMMERCETOOLS_PROJECT_KEY",
      "makePaymentRequest": "{\"amount\":{\"currency\":\"EUR\",\"value\":1000},\"reference\":\"YOUR_REFERENCE\",\"paymentMethod\":{\"type\":\"scheme\",\"encryptedCardNumber\":\"test_4111111111111111\",\"encryptedExpiryMonth\":\"test_03\",\"encryptedExpiryYear\":\"test_2030\",\"encryptedSecurityCode\":\"test_737\"},\"returnUrl\":\"https://your-company.com/...\",\"merchantAccount\":\"YOUR_MERCHANT_ACCOUNT\"}",
      "makePaymentResponse": "{\"resultCode\":\"RedirectShopper\",\"action\":{\"paymentData\":\"Ab02b4c0!...\",\"paymentMethodType\":\"scheme\",\"url\":\"https://test.adyen.com/hpp/3d/validate.shtml\",\"data\":{\"MD\":\"aTZmV09...\",\"PaReq\":\"eNpVUtt...\",\"TermUrl\":\"https://your-company.com/...\"},\"method\":\"POST\",\"type\":\"redirect\"},\"details\":[{\"key\":\"MD\",\"type\":\"text\"},{\"key\":\"PaRes\",\"type\":\"text\"}],\"paymentData\":\"Ab02b4c0!...\",\"redirect\":{\"data\":{\"PaReq\":\"eNpVUtt...\",\"TermUrl\":\"https://your-company.com/...\",\"MD\":\"aTZmV09...\"},\"method\":\"POST\",\"url\":\"https://test.adyen.com/hpp/3d/validate.shtml\"}}",
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

</details>

Notice that a transaction added to the commercetools payment. The transaction is of type `Authorization` and has `amount` taken from `amountPlanned`. `interactionId` is matching the `submitAdditionalPaymentDetailsResponse`.

#### Action Response

If you received an action object you need to repeat [Step-6](#step-6-submit-additional-payment-details) again.

<details>
<summary>Here an example commercetools payment with submitAdditionalPaymentDetailsResponse field with the action object. Click to expand. </summary>

```json
{
  "custom": {
    "type": {
      "typeId": "type",
      "key": "ctp-adyen-integration-web-components-payment-type"
    },
    "fields": {
      "adyenMerchantAccount": "YOUR_MERCHANT_ACCOUNT",
      "commercetoolsProjectKey": "YOUR_COMMERCETOOLS_PROJECT_KEY",
      "makePaymentRequest": "{\"amount\":{\"currency\":\"EUR\",\"value\":1000},\"reference\":\"YOUR_REFERENCE\",\"paymentMethod\":{\"type\":\"scheme\",\"encryptedCardNumber\":\"test_4111111111111111\",\"encryptedExpiryMonth\":\"test_03\",\"encryptedExpiryYear\":\"test_2030\",\"encryptedSecurityCode\":\"test_737\"},\"returnUrl\":\"https://your-company.com/...\",\"merchantAccount\":\"YOUR_MERCHANT_ACCOUNT\"}",
      "makePaymentResponse": "{\"resultCode\":\"RedirectShopper\",\"action\":{\"paymentData\":\"Ab02b4c0!...\",\"paymentMethodType\":\"scheme\",\"url\":\"https://test.adyen.com/hpp/3d/validate.shtml\",\"data\":{\"MD\":\"aTZmV09...\",\"PaReq\":\"eNpVUtt...\",\"TermUrl\":\"https://your-company.com/...\"},\"method\":\"POST\",\"type\":\"redirect\"},\"details\":[{\"key\":\"MD\",\"type\":\"text\"},{\"key\":\"PaRes\",\"type\":\"text\"}],\"paymentData\":\"Ab02b4c0!...\",\"redirect\":{\"data\":{\"PaReq\":\"eNpVUtt...\",\"TermUrl\":\"https://your-company.com/...\",\"MD\":\"aTZmV09...\"},\"method\":\"POST\",\"url\":\"https://test.adyen.com/hpp/3d/validate.shtml\"}}",
      "submitPaymentDetailsRequest": "{\"details\":{\"redirectResult\":\"Ab02b4c0!...\"}}",
      "submitAdditionalPaymentDetailsResponse": "{\"resultCode\":\"ChallengeShopper\",\"action\":{\"paymentData\":\"Ab02b4c0!...\",\"paymentMethodType\":\"scheme\",\"token\":\"eyJhY3...\",\"type\":\"threeDS2Challenge\"},\"authentication\":{\"threeds2.challengeToken\":\"eyJhY3...\"},\"details\":[{\"key\":\"threeds2.challengeResult\",\"type\":\"text\"}],\"paymentData\":\"Ab02b4c0!...\"}"
    }
  }
}
```

</details>

In order to do so remove the existing `submitAdditionalPaymentDetailsResponse` custom field. This can be done in a single payment update request as follows:

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

## Error handling

In case you encounter errors in your integration, refer to the following:

### Extension module errors

If you receive a `non-HTTP 200 response`, use the commercetools payment `interface interactions` to troubleshoot the response.

Interface interactions can represent a `request` sent to Adyen, a `response`, or a `notification` received from Adyen.
Some interactions may result in a transaction. If so, the interactionId in the payment transaction will be set to match the `pspReference` of the Adyen API.

### Adyen payment refusals

If you receive an `HTTP 200 response` with an `Error` or `Refused` resultCode from Adyen, a transaction with a `Failure` state will be added to the commercetools payment object. Payment objects with failed transactions can not be reused for further retries. In order to retry the payment process, a new commercetools payment resource needs to be created and payment steps like `makePaymentRequest` etc. re-applied.
Use the commercetools payment [interfaceInteractions](https://docs.commercetools.com/api/projects/payments#payment) field to troubleshoot the response.

Check the following table to see the mapping of Adyen [result codes](https://docs.adyen.com/development-resources/response-handling#error-codes-types) to commercetools [transaction state](https://docs.commercetools.com/http-api-projects-payments#transactionstate)
|Adyen result code| The commercetools transaction (transaction state)
| --- | --- |
| Authorised| Authorization (Success)|
| Refused| Authorization (Failure)|
| Error| Authorization (Failure)|

### Shopper successfully paid but `redirectUrl` was not reached

In some payment redirect cases, there might be a valid payment but no order as the shopper did not reach the shop's `redirectUrl`.
For example, after successfully issued payment shopper loses internet connection or accidentally closes the tab.
In this case [Notification module](../../notification) will receive asynchronously a notification from Adyen with payment confirmation which will result in a transaction creation or transaction state change.
An optional usage of scheduled [commercetools-payment-to-order-processor](https://github.com/commercetools/commercetools-payment-to-order-processor) job ensures that for every successful payment
an order can still be asynchronously created.

### Shopper tries to pay a different amount than the actual order amount

For redirect payments payment amount is bound to `redirectUrl`.
After redirect and before the actual finalization of the payment at the provider's page, the shopper is still able to change the cart's amount within the second tab.
If the shopper decides to change the cart's amount within the second tab and finalize payment within the first tab, then according to payment amount [validation](#step-1-commercetools-checkout-validations) an error
has to be shown and order creation must be declined. In such a case, it might be reasonable to [cancel or refund](#cancel-or-refund) the invalid payment.

## Test and go live

Before you go live please follow [steps](https://docs.adyen.com/online-payments/web-components/integrated-before-5-0-0#testing-your-integration) described by Adyen.

- [Please check FAQ guide](../../docs/FAQ.md).

Additionally, follow the official Adyen [integration checklist](https://docs.adyen.com/development-resources/integration-checklist).

# Manual Capture

By default, payments are captured immediately (or with [delay](https://docs.adyen.com/online-payments/capture#capture-delay)) after authorisation. For payment methods that support separate authorization and capture, you also have the option to capture the payment later, for example only after the goods have been shipped. This also allows you to cancel the payment/authorization.

Payments like [Klarna](https://docs.adyen.com/payment-methods/klarna/web-component#capture) or [Affirm](https://docs.adyen.com/payment-methods/affirm/web-component#capture-the-payment) have to be manually captured, even if you have enabled automatic capture for other payment methods.
If you need to explicitly request a capture for each payment please follow our [manual capture documentation](./ManualCapture.md).

# Cancel or refund

If you want to return the funds to your shopper, use either Cancel or Refund functionalities.

This will either:

- [**Cancel**](CancelPayment.md) - cancel the authorisation on an uncaptured payment(full payment).
- [**Refund**](Refund.md) - (partially) refund a payment back to the shopper.

# Restore

Restore gives your shoppers an opportunity to offset their carbon emissions from the delivery or lifecycle of their purchase at checkout.
For the integration details please follow our [restore documentation](./Restore.md).

# Multi-tenancy

`commercetools-adyen-integration` supports multi-tenancy to serve multiple Adyen merchant accounts/commercetools projects
with one application instance. This architectural style leverages sharing and scalability to provide cost-efficient hosting.

In order for `commercetools-adyen-integration` to know which project and merchant account it should communicate with, `adyenMerchantAccount` and `commercetoolsProjectKey` custom fields must be provided on payment creation.

> `commercetoolsProjectKey` is passed to Adyen using the field [`metadata.ctProjectKey`](https://docs.adyen.com/api-explorer/#/CheckoutService/v66/post/payments__reqParam_metadata). This field is also present in every notification from Adyen to help with matching the correct commercetools project.

**IMPORTANT: `commercetoolsProjectKey` must not have more than 80 characters. This is due to length restrictions of the Adyen API.**
