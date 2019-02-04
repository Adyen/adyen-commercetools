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

After that, execute command `npm run extension`
