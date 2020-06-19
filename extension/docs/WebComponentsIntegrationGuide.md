<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Table of Contents** 

- [Web Components integration guide](#web-components-integration-guide)
  - [Before you begin](#before-you-begin)
  - [Step 1: CTP checkout validations](#step-1-ctp-checkout-validations)
    - [Validate cart state](#validate-cart-state)
    - [Recalculate cart](#recalculate-cart)
    - [Validate payment](#validate-payment)
    - [Validate payment transaction](#validate-payment-transaction)
  - [Step 2: Get available payment methods](#step-2-get-available-payment-methods)
  - [Step 3: Add Components to your payments form](#step-3-add-components-to-your-payments-form)
  - [Step N: Cancel or refund](#step-n-cancel-or-refund)
  - [Error handling](#error-handling)
    - [Extension module errors](#extension-module-errors)
    - [Adyen payment refusals](#adyen-payment-refusals)
    - [Shopper successfully paid but `redirectUrl` was not reached](#shopper-successfully-paid-but-redirecturl-was-not-reached)
    - [Shopper tries to pay a different amount than the actual order amount](#shopper-tries-to-pay-a-different-amount-than-the-actual-order-amount)
  - [Test and go live](#test-and-go-live)
- [Bad Practices](#bad-practices)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# Web Components integration guide

The following diagram shows the whole checkout integration flow using with [Adyen Web Components](https://docs.adyen.com/checkout/components-web).

![Flow](https://user-images.githubusercontent.com/3469524/85017686-3317bf00-b16c-11ea-8840-f34b97ac3dcb.jpeg)

## Before you begin
If you haven't done so already, follow the official Adyen [get started guide](https://docs.adyen.com/checkout/get-started) to set up your test account, get your API key.
In order to make the extension module working, follow our [deployment guide](./DeploymentGuide.md).

## Step 1: CTP checkout validations

In the merchant server, ensure the steps below are done:
1. On each checkout step [validate cart state](#validate-cart-state)
1. Before starting payment process make sure there is no valid payments already:
    * [Recalculate cart](#recalculate-cart)
    * [Validate payment](#validate-payment)
    * [Validate payment transaction](#validate-payment-transaction)

### Validate cart state
Check if [current cart has been ordered already](https://docs.commercetools.com/http-api-projects-carts#cartstate) (`Cart.cartState = Ordered`).
In this case, load order by ordered cart ID and show order confirmation page.
This might happen if the cart has been already ordered in a different tab 
or by asynchronous process like [commercetools-payment-to-order-processor job](https://github.com/commercetools/commercetools-payment-to-order-processor).

### Recalculate cart
[Execute cart recalculate](https://docs.commercetools.com/http-api-projects-carts#recalculate) to ensure:
 - Cart totals are always up-to-date 
 - Time-limited discounts are not removed/invalidated from the cart automatically. They are validated on recalculate and order creation only.

### Validate payment
There must be at least one CTP payment object of type Adyen (`Payment.paymentMethodInfo.paymentInterface = ctp-adyen-integration`).

### Validate payment transaction
Cart's payment counts as successful if there is at least one payment object
with successful transaction state (`Payment.Transaction.state=Success`) 
and transactions type `Authorization` or `Charge`.

If all the above validations passed then the order can be created right away and order confirmation page shown.

Otherwise, the shopper might continue with further payment steps.

## Step 2: Get available payment methods
When your shopper is ready to pay, get a list of the available payment methods based on their country, device, and the payment amount.

From the merchant server, [Create/Update CTP payment](https://docs.commercetools.com/http-api-projects-payments#create-a-payment) with `getPaymentMethodsRequest` custom field.  

Set `getPaymentMethodsRequest` custom field for a shopper in the Germany, for a payment of `10 EUR`: 

``` json
{
  "countryCode": "DE",
  "shopperLocale": "de-DE",
  "amount": {
    "currency": "EUR",
    "value": 1000
  }
}
```

CTP payment representation:

``` json
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

The response includes the list of available payment methods:

``` json
{
 "paymentMethods":[
  {
    "name":"Credit Card",
    "type":"scheme"
  },
  {
    "name":"SEPA Direct Debit",
    "type":"sepadirectdebit"
  },
 ]
}
```

CTP payment representation:

``` json
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

## Step 3: Add Components to your payments form

Next, use the `Component` to render the payment method, and collect the required payment details from your shopper.

If you haven't created the payment forms already in your frontend, follow the official [Web Components integration guide](https://docs.adyen.com/checkout/components-web#step-2-add-components) from Adyen.

An `origin key` is a client-side key that is used to validate Adyen's JavaScript component library. It is required to render Component.

To be able to get the origin key extension module could be used, from the merchant server, [Update CTP payment](https://docs.commercetools.com/http-api-projects-payments#update-payment) with `getPaymentMethodsRequest` custom field.

An [update action](https://docs.commercetools.com/http-api-projects-payments#set-customfield) to set `getOriginKeysRequest` custom field.
```
{
  "version": "PAYMENT_VERSION",
  "actions": [  
    {
      "action": "setCustomField",
      "name": "getOriginKeysRequest",
      "value": "{\"originDomains\":[\"https://www.your-company1.com\",\"https://www.your-company2.com\"]}"
    }
  ]
}
```

The response contains a list of origin keys for all requested domains. For each list item, the key is the domain, and the value is its associated origin key.

``` json
{
 "originKeys":{
    "https://www.your-company1.com":"pub.v2.99...",
    "https://www.your-company2.com":"pub.v2.99...",
 }
}
```

CTP payment representation:

``` json
{
  "custom": {
    "type": {
      "typeId": "type",
      "key": "ctp-adyen-integration-web-components-payment-type"
    },
    "fields": {
      "getOriginKeysRequest": "{\"originDomains\":[\"https://www.your-company1.com\",\"https://www.your-company2.com\"]}",
      "getOriginKeysResponse": "{\"originKeys\":{\"https://www.your-company1.com\":\"pub.v2.99...\",\"https://www.your-company2.com\":\"pub.v2.99...\"}}"
    }
  }
}
```

Pass the `origin key` to your front end. You might use this origin key to be able to render Component.

> Note: The first 2 steps are optional if origin key and payment methods have been already cached by the merchant server.
 

## Step N: Cancel or refund
If you want to return the funds to your shopper, but are not certain whether the payment has been captured or not, use the Cancel or Refund functionality. 

This will either: 

- [**Cancel**](CancelRefundPayment.md#cancel-or-refund-a-payment) - cancel the authorisation on an uncaptured payment.
- [**Refund**](CancelRefundPayment.md#cancel-or-refund-a-payment) - refund a payment back to the shopper.

## Error handling

In case you encounter errors in your integration, refer to the following:

### Extension module errors

If you receive a `non-HTTP 200 response`, use the CTP `interface interactions` to troubleshoot the request and errors.

Interface interactions can be requests sent to the Adyen, responses received from the Adyen or notifications received from the Adyen. 
Some interactions may result in a transaction. If so, the interactionId in the Transaction should be set to match the `pspReference` of the Adyen for the interaction.

### Adyen payment refusals

If you receive an HTTP 200 response with an Error or Refused resultCode, check the refusal reason and, if possible, modify your request.

Check the following table to see the mapping of Adyen [result codes](https://docs.adyen.com/development-resources/response-handling#error-codes-types) to CTP [transaction state](https://docs.commercetools.com/http-api-projects-payments#transactionstate)
|Adyen result code| CTP transaction state
| --- | --- |
| Authorised| Success|
| Refused| Failure|
| Error| Failure|

### Shopper successfully paid but `redirectUrl` was not reached
In some payment redirect cases, there might be a valid payment but no order as shopper did not reach the shop's `redirectUrl`.
For example, after successfully issued payment shopper loses internet connection or accidentally closes the tab.
In this case [Notification module](../../notification) will receive later a notification with successful content, process it, and update the payment.
Usage of scheduled [commercetools-payment-to-order-processor](https://github.com/commercetools/commercetools-payment-to-order-processor) job ensures that for every successful payment
an order can still be asynchronously created.

### Shopper tries to pay a different amount than the actual order amount
For redirect payments payment amount is bound to `redirectUrl`.
After redirect and before the actual finalization of the payment at the provider's page, the shopper is still able to change the cart's amount within the second tab.
If shopper decides to change cart's amount within the second tab and finalize payment within the first tab, then according to payment amount validation an error
will be shown and order creation declined.

## Test and go live
After doing the all steps above and testing the payment methods with your test accounts, then when you are ready to go live, you need to do the following steps described as [testing the integration](https://docs.adyen.com/checkout/components-web/#testing-your-integration).

Additionally, follow the official Adyen [integration checklist](https://docs.adyen.com/development-resources/integration-checklist) to ensure you have a complete implementation into Adyen.

# Bad Practices
- **Never delete or un-assign** created payment objects during checkout from the cart. If required — clean up unused/obsolete payment objects by another asynchronous process instead.
