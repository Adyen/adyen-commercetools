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
    * `payment.paymentMethodInfo.paymentInterface === 'ctp-adyen-integration'`
    * `paymentMethodInfo.method == null`   
    * `paymentMethodInfo.countryCode != null`   
1. Adyen-integration will call Adyen on create and save the response to interface interaction 
with `type='ctp-adyen-integration-interaction'` and `fields.type='getPaymentDetails'`  

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
