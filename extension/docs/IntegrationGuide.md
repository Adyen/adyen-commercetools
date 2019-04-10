# Integration of payment into checkout process

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Contents**

  - [Glossary](#glossary)
  - [Requirements for CTP project:](#requirements-for-ctp-project)
  - [Required parameters](#required-parameters)
- [Checkout steps](#checkout-steps)
- [Validations](#validations)
    - [Validate cart state](#validate-cart-state)
    - [Recalculate cart](#recalculate-cart)
    - [Validate payment](#validate-payment)
    - [Validate payment transaction](#validate-payment-transaction)
    - [Mapping from Adyen result codes to CTP transaction state](#mapping-from-adyen-result-codes-to-ctp-transaction-state)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Glossary
In this process, there are 3 parties involved:

**Frontend** - the browser part of the shop. This is what the shopper interacts with.  
**Backend** - the shop server which supplies front end with data.  
**Adyen-integration** - hosted service (this repository) that interacts over [API extensions](https://docs.commercetools.com/http-api-projects-api-extensions).  
**Shopper** - a person that's using the shop

## Requirements for CTP project:
All the requirements below should be automatically created by the Adyen-integration. It will not create if there
are already resources with same key in the CTP project. In this case, you have to synchronize by yourself.
1. [API Extension subscription to Adyen-integration endpoints](../resources/api-extensions.json)
1. [Custom types for payments](../resources/payment-custom-types.json)
1. [Custom types for interface interactions](../resources/payment-interface-interaction-types.json)

## Required parameters
In order to make the extension module working, following parameters have to be provided to the Adyen-integration.

| Name | Description | Default value |
| --- | --- | --- |
| `CTP_PROJECT_KEY` | CTP credentials of the shop project. Go to `https://mc.commercetools.com/${your-ctp-project}/settings/developer/api-clients`. This module needs to CRUD multiple CTP resources, thus recommended scope is manage_project. | |
| `CTP_CLIENT_ID` | CTP credentials of the shop project. Go to `https://mc.commercetools.com/${your-ctp-project}/settings/developer/api-clients`. This module needs to CRUD multiple CTP resources, thus recommended scope is manage_project. | |
| `CTP_CLIENT_SECRET` | CTP credentials of the shop project. Go to `https://mc.commercetools.com/${your-ctp-project}/settings/developer/api-clients`. This module needs to CRUD multiple CTP resources, thus recommended scope is manage_project. | |
| `API_EXTENSION_BASE_URL` | URL of the Adyen-integration. This URL will be called by CTP Extension endpoint. | |
| `ADYEN_API_KEY` | Go to [Account/Users](https://ca-test.adyen.com/ca/ca/config/users.shtml) - Select a user with `Web Service` User type - Generate New API Key (notice: in case you get `403 Forbidden` error from Adyen, try to regenerate the key). | |
| `ADYEN_MERCHANT_ACCOUNT` | Go to [Account/Merchant accounts](https://ca-test.adyen.com/ca/ca/accounts/show.shtml?accountTypeCode=MerchantAccount). | |

# Checkout steps
1. On each checkout step [validate cart state](#validate-cart-state)
1. Before starting payment process make sure there is no valid payments already:
    * [Recalculate cart](#recalculate-cart)
    * [Validate payment](#validate-payment)
    * [Validate payment transaction](#validate-payment-transaction)

If all above validations are passed then order can be created right away and order confirmation page shown.
Otherwise shopper might continue with further payment steps.

1. **Get available payment methods**  
    1. In order to [get which payment methods are available to the current shopper](https://docs.adyen.com/developers/checkout/api-integration#step1getavailablepaymentmethods),
    you have to create/update a CTP Payment with following properties:
        - `Payment.paymentMethodInfo.method = empty or undefined`   
        - `Payment.paymentMethodInfo.countryCode != null` - set the country of a shopper. Please consult with Adyen for the right format.  
    1. Adyen-integration will make a [request](https://docs.adyen.com/developers/checkout/api-integration#step1getavailablepaymentmethods) to Adyen API.
    1. The response will be saved in interface interaction with `type='ctp-adyen-integration-interaction'` and `fields.type='getPaymentDetails'` as stringified JSON.
    1. Before presenting all the methods, please check Adyen-integration documentation for supported payment methods.
1. **Continue with one of the supported payment methods:**
    1. [Credit card payment](./CreditCardIntegration.md)  
    1. [Paypal payment](./PaypalIntegration.md)

# Error cases
1. **Adyen returns HTTP code other than 200**  
Request and response from Adyen are always stored in `Payment.interfaceInteractions` as strigified JSON.
1. **Shopper successfully paid but `redirectUrl` was not reached**  
In some payment redirect cases there might be a valid payment but no order as shopper did not reach frontend's `redirectUrl`.
For example after successfully issued payment shopper loses internet connection or accidentally closes the tab.
In this case [Notification module](../../notification) will receive later a notification with successful content, process it and update the payment.
Usage of scheduled [commercetools-payment-to-order-processor](https://github.com/commercetools/commercetools-payment-to-order-processor) job ensures that for every successful payment
an order can still be asynchronously created.
1. **Shopper tries to pay different amount than the actual order amount**   
For redirect payments payment amount is bound to `redirectUrl`.
After redirect and before actual finalisation of the payment at provider's page, shopper is still able to change the cart's amount within the second tab.
If shopper decides to change cart's amount within the second tab and finalise payment within the first tab, then according to payment amount validation an error
will be shown and order creation declined.

# Validations
### Validate cart state
Check if current cart has been ordered already (`Cart.cartState = Ordered`).
In this case load order by ordered cart ID and show oder confirmation page.
This might happen if cart has been already ordered in a different tab 
or by asynchronous process like [commercetools-payment-to-order-processor job](https://github.com/commercetools/commercetools-payment-to-order-processor).

### Recalculate cart
To ensure cart totals are always up-to-date execute cart recalculate.
Time limited discounts are not removed/invalidated from cart automatically. 
They are validated on recalculate and order creation only.

### Validate payment
There must be at least one CTP payment object of type Adyen
(`Payment.paymentMethodInfo.paymentInterface = ctp-adyen-integration`).

### Validate payment transaction
Cart's payment counts as successful if there is at least one payment object
with only successful (`Payment.Transaction.state=Success`)
payment transactions of type `Charge`.

### Mapping from Adyen result codes to CTP transaction state
|Adyen result code| CTP transaction state
| --- | --- |
| redirectshopper| Pending|
| received| Pending|
| pending| Pending|
| authorised| Success|
| refused| Failure|
| cancelled| Failure|
| error| Failure|

# Bad practice
- Never delete or un-assign created payment objects during checkout from the cart. If required — clean up unused/obsolete payment objects by another asynchronous process instead.
