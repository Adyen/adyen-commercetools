# Set up extensions module

In order to run extension module, several information needs to be provided as environmental variables.

1. `ADYEN_API_KEY`: Get your key from https://ca-test.adyen.com/ca/ca/config/users.shtml. Select `Web Service` user type account. Sometimes it's necessary to regenerate the API Key, otherwise you'll get `403 Forbidden` error. 

1. `ADYEN_MERCHANT_ACCOUNT`: See https://ca-test.adyen.com/ca/ca/accounts/show.shtml?accountTypeCode=MerchantAccount

1. `ADYEN_API_BASE_URL`: base URL for all Adyen requests, e.g. currently for testing we're using `https://checkout-test.adyen.com/v40`
