# Front-end integration guide
Adyen documentation for common workflow: https://docs.adyen.com/developers/checkout/api-integration

## Requirements for CTP project:
All the requirements above should be automatically created by the Adyen-integration. It will not create if there
are already resources with same key in the CTP project.
1. [API Extension subscription to Adyen-integration endpoints](./resources/api-extensions.json)
1. [Custom types for payments](./resources/payment-custom-types.json)
1. [Custom types for interface interactions](./resources/payment-interface-interaction-types.json)

## Get available payment methods
Adyen documentation: https://docs.adyen.com/developers/checkout/api-integration#step1getavailablepaymentmethods

1. Backend creates a payment with following criteria
    * `payment.paymentMethodInfo.paymentInterface = 'ctp-adyen-integration'`
    * `paymentMethodInfo.method = null`   
    * `paymentMethodInfo.countryCode != null`   
1. Adyen-integration will call Adyen on create and save the response to interface interaction 
with `type='ctp-adyen-integration-interaction'` and `fields.type='getPaymentDetails'`

## Credit card payment
Adyen documentation: https://docs.adyen.com/developers/payment-methods/cards (notice: Recurring card payments not supported, manual capture is not supported)

1. Backend creates a payment with following criteria
    * `payment.paymentMethodInfo.paymentInterface = 'ctp-adyen-integration'`
    * `payment.paymentMethodInfo.method = 'creditCard'`
    * `payment.interfaceId != null`
    * `payment.transactions` contains a transaction with `type='Charge' and (state='Initial' or state='Pending')`
    * `payment.interfaceInteractions` doesn't contain an interaction with `type='makePayment'`
1. Adyen-integration will make a payment request and save following information to the payment object:
    * `pspReference` will be saved in `payment.interfaceId`
    * request and response with Adyen will be saved in `payment.interfaceInteractions`
    * `payment.transactions` with a transaction `type='Charge' and (state='Initial' or state='Pending')` will be changed to `state='Charge'`
    
## Credit card payment with 3D Secure
Adyen documentation: https://docs.adyen.com/developers/payment-methods/cards-with-3d-secure (notice: SecurePlus authentication not supported)

1. Backend creates a payment with following criteria
    * `payment.paymentMethodInfo.paymentInterface = 'ctp-adyen-integration'`
    * `payment.paymentMethodInfo.method = 'creditCard'`
    * `payment.custom.fields.encryptedCardNumber != null`
    * `payment.custom.fields.encryptedExpiryMonth != null`
    * `payment.custom.fields.encryptedExpiryYear != null`
    * `payment.custom.fields.encryptedSecurityCode != null`
    * `payment.custom.fields.returnUrl != null`
    * `payment.interfaceId != null`
    * `paymentObject.custom.fields.executeThreeD = true`
    * `payment.transactions` contains a transaction with `type='Charge' and (state='Initial' or state='Pending')`
    * `payment.interfaceInteractions` doesn't contain an interaction with `type='makePayment'`
1. Adyen-integration will make a payment request and save following information to the payment object:
    * request and response with Adyen will be saved in `payment.interfaceInteractions`
    * `payment.custom.fields.MD` will be set
    * `payment.custom.fields.PaReq` will be set
    * `payment.custom.fields.paymentData` will be set
    * `payment.custom.fields.redirectUrl` will be set
    * `payment.custom.fields.redirectMethod` will be set
1. Frontend creates a redirect URL using the custom fields above and redirect user to 3D Secure verification
1. After verification, Adyen redirects user back to the shop. Backend collects request parameter `PaRes` and save it to a payment as `payment.custom.fields.PaRes`
1. Adyen-integration will complete the payment and sae following information to the payment object:
    * request and response with Adyen will be saved in `payment.interfaceInteractions`
    * `pspReference` will be saved in `payment.interfaceId`
    
## Paypal payment
Adyen documentation: https://docs.adyen.com/developers/payment-methods/paypal

1. Backend creates a payment with following criteria
    * `payment.paymentMethodInfo.paymentInterface = 'ctp-adyen-integration'`
    * `payment.paymentMethodInfo.method = 'paypal'`
    * `payment.custom.fields.returnUrl != null`
    * `payment.interfaceId != null`
    * `payment.transactions` contains a transaction with `type='Charge'` and `state='Initial'`
1. Adyen-integration will make a `Redirect shopper` request and save following information to the payment object:
    * request and response with Adyen will be saved in `payment.interfaceInteractions`
    * `payment.custom.fields.redirectUrl` will be set
    * `payment.custom.fields.redirectMethod` will be set
    * `Charge` transaction state will be updated to `Pending`
1. Frontend redirects user to Paypal using the custom fields above
1. After user comes back to the shop from Paypal, backend collects request parameter `payload` (decoded) and save it to a payment as `payment.custom.fields.payload`
1. Adyen-integration will complete the payment and sae following information to the payment object:
    * request and response with Adyen will be saved in `payment.interfaceInteractions`
    * `Charge` transaction state will be updated to `Success` or `Pending` according to returned `resultCode` from Adyen.
    * `psReference` will be saved in `Charge` transaction as `interactionId`
    
# Set up extensions module

In order to run extension module, create following environmental variables.

1. `ADYEN_API_KEY`: get your key from https://ca-test.adyen.com/ca/ca/config/users.shtml. Select `Web Service` user type account. Sometimes it's necessary to regenerate the API Key, otherwise you'll get `403 Forbidden` error. 

1. `ADYEN_MERCHANT_ACCOUNT`: see https://ca-test.adyen.com/ca/ca/accounts/show.shtml?accountTypeCode=MerchantAccount

1. `ADYEN_API_BASE_URL`: base URL for all Adyen requests, e.g. currently for testing we're using `https://checkout-test.adyen.com/v40`

1. `CTP_PROJECT_KEY`: get CTP credentials from https://mc.commercetools.com/${your CTP project ID}/settings/developer/api-clients. This module needs to CRUD multiple CTP resources, thus recommended scope is `manage_project`.

1. `CTP_CLIENT_ID`: get CTP credentials from https://mc.commercetools.com/${your CTP project ID}/settings/developer/api-clients. This module needs to CRUD multiple CTP resources, thus recommended scope is `manage_project`.

1. `CTP_CLIENT_SECRET`: get CTP credentials from https://mc.commercetools.com/${your CTP project ID}/settings/developer/api-clients. This module needs to CRUD multiple CTP resources, thus recommended scope is `manage_project`.

1. `API_EXTENSION_BASE_URL`: URL that will be used to create API extensions. In case of any payment changes, CTP API will call this URL and pass the payment object as body. See https://docs.commercetools.com/http-api-projects-api-extensions. 

1. `CLIENT_ENCRYPTION_PUBLIC_KEY`: Get your key from https://ca-test.adyen.com/ca/ca/config/users.shtml. Select `Web Service` user type account.

After setting all variables, execute command `npm run extension` to run the module.
