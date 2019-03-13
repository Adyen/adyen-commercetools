# Development guide

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Contents**

- [Prerequisites](#prerequisites)
- [Run Module](#run-module)
      - [Notice:](#notice)
- [Run Tests](#run-tests)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Prerequisites
1. Install Node.js >=10
1. Install npm >=5
1. Run `npm i`

## Run Module
In order to run extension module, you have to provide following environmental variables:
1. `ADYEN_API_KEY`: get your key from https://ca-test.adyen.com/ca/ca/config/users.shtml. Select `Web Service` user type account and `Generate New API Key`. 
1. `ADYEN_MERCHANT_ACCOUNT`: see https://ca-test.adyen.com/ca/ca/accounts/show.shtml?accountTypeCode=MerchantAccount
1. `ADYEN_API_BASE_URL`: base URL for all Adyen requests, e.g. for testing we're using `https://checkout-test.adyen.com/v40`
1. `CTP_PROJECT_KEY`: get CTP credentials from `https://mc.commercetools.com/${your CTP project ID}/settings/developer/api-clients`. This module needs to CRUD multiple CTP resources, thus recommended scope is `manage_project`.
1. `CTP_CLIENT_ID`: get CTP credentials from `https://mc.commercetools.com/${your CTP project ID}/settings/developer/api-clients`. This module needs to CRUD multiple CTP resources, thus recommended scope is `manage_project`.
1. `CTP_CLIENT_SECRET`: get CTP credentials from `https://mc.commercetools.com/${your CTP project ID}/settings/developer/api-clients`. This module needs to CRUD multiple CTP resources, thus recommended scope is `manage_project`.
1. `API_EXTENSION_BASE_URL`: URL of the Adyen-integration server. In case of any payment changes, [CTP API extension](https://docs.commercetools.com/http-api-projects-api-extensions) will call this URL and pass the payment object in body.
 
After setting all variables, execute command `npm run extension` to run the module.
##### Notice:
Sometimes it's necessary to regenerate the API Key in Adyen, otherwise you'll get `403 Forbidden` error from Adyen.

## Run Tests
In addition to the environmental variables from [Run Module](#run-module), there's one additional environmental variable:
1. `CLIENT_ENCRYPTION_PUBLIC_KEY`: Get your key from https://ca-test.adyen.com/ca/ca/config/users.shtml. Select `Web Service` user type account and copy `Client Encryption Public Key`. This key is used to encrypt credit card credentials in tests.

There are 3 different types of tests. Don't forget to provide all required environmental variables:
1. [Unit tests](../test/unit) - these tests are mocking all external communications.
1. [Integration tests](../test/integration) - these tests interacts with real 3rd party systems.
1. [Web tests](../../cypress/integration) - for some payment methods, it's not possible to test without interacting
with the UI (e.g. credit card 3ds). In such cases, we use Cypress.io. Run `npm run cypress-ui` to test.
