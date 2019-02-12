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

In order to run extension module, several information needs to be provided as environmental variables.

1. `ADYEN_API_KEY`: Get your key from https://ca-test.adyen.com/ca/ca/config/users.shtml. Select `Web Service` user type account. Sometimes it's necessary to regenerate the API Key, otherwise you'll get `403 Forbidden` error. 

1. `ADYEN_MERCHANT_ACCOUNT`: See https://ca-test.adyen.com/ca/ca/accounts/show.shtml?accountTypeCode=MerchantAccount

1. `ADYEN_API_BASE_URL`: base URL for all Adyen requests, e.g. currently for testing we're using `https://checkout-test.adyen.com/v40`
