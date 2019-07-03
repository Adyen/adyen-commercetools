# Development guide

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Contents**

- [Prerequisites](#prerequisites)
- [Run Module](#run-module)
      - [Notice:](#notice)
- [Run Tests](#run-tests)
- [Deployment](#deployment)
  - [AWS Lambda](#aws-lambda)
  - [Docker](#docker)
    - [Pull the image](#pull-the-image)
    - [Run the container](#run-the-container)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Prerequisites
1. Install Node.js >=8
1. Install npm >=6
1. Run `npm ci`

## Run Module
Environment variables to configure the notification module:

| Name | Content | Required | Default value |
| --- | --- | --- | --- |
|`ADYEN_API_KEY` | Get your key from https://ca-test.adyen.com/ca/ca/config/users.shtml. Select `Web Service` user type account and `Generate New API Key`. | YES | |
|`ADYEN_MERCHANT_ACCOUNT` | See https://ca-test.adyen.com/ca/ca/accounts/show.shtml?accountTypeCode=MerchantAccount | YES | |
|`ADYEN_API_BASE_URL` | Base URL for Adyen requests | NO | `https://checkout-test.adyen.com/v40` |
|`ADYEN_LEGACY_API_BASE_URL` | Base legacy URL for Adyen requests. Adyen is in the migration process of API URLs and for some actions, the legacy URL has to be used (e.g. refund). | NO | `https://pal-test.adyen.com/pal/servlet/Payment/v40` |
|`CTP_PROJECT_KEY` | Get CTP credentials from `https://mc.commercetools.com/${your CTP project ID}/settings/developer/api-clients`. This module needs to CRUD multiple CTP resources, thus recommended scope is `manage_project`. |  YES | |
|`CTP_CLIENT_ID` | Get CTP credentials from `https://mc.commercetools.com/${your CTP project ID}/settings/developer/api-clients`. This module needs to CRUD multiple CTP resources, thus recommended scope is `manage_project`. | YES | |
|`CTP_CLIENT_SECRET` | Get CTP credentials from `https://mc.commercetools.com/${your CTP project ID}/settings/developer/api-clients`. This module needs to CRUD multiple CTP resources, thus recommended scope is `manage_project`. | YES | |
|`API_EXTENSION_BASE_URL` | URL of the Extension module server. In case of any payment changes, [CTP API extension](https://docs.commercetools.com/http-api-projects-api-extensions) will call this URL and pass the payment object in body. | YES | |
|`LOG_LEVEL` | bunyan log level (`trace`, `debug`, `info`, `warn`, `error`, `fatal`)| NO | `info`
|`PORT` | port on which the application will run | NO | 8080
|`ENSURE_RESOURCES` | Set to `false` to disable the creation of resources in commercetools (e.g. custom types) | NO | `true`


After setting all environmental variables, execute command `npm run extension` to run the module.
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

## Deployment

### AWS Lambda

For deployment to lambda zip the extensions folder and specify `src/lambda.handler` as the entry point for the function

When deploying the lambda, it will not create the custom types for you. These are required for the extension to operate correctly.
You can create these by running the command `npm run create-custom-types` and providing the `CTP_PROJECT_KEY`, `CTP_CLIENT_ID` and `CTP_CLIENT_SECRET` environment variables.

Example command (bash): `CTP_PROJECT_KEY="project_key" CTP_CLIENT_ID="client_id" CTP_CLIENT_SECRET="client_secret" npm run create-custom-types`

You will also need to setup the API extension manually as detailed [here](https://docs.commercetools.com/http-api-projects-api-extensions) for resourceTypeId `payment` and actions `Create and Update`

### Docker
For easy deployment you can use the [Extension module docker image](https://hub.docker.com/r/commercetools/commercetools-adyen-integration-extension/tags).

#### Pull the image 
```
docker pull commercetools/commercetools-adyen-integration-extension:X.X.X
```
(replace X.X.X with a image tag)

#### Run the container

Replace all `XXX` values and execute:
```
docker run -e ADYEN_API_BASE_URL=XXX -e ADYEN_MERCHANT_ACCOUNT=XXX -e API_EXTENSION_BASE_URL=XXX -e CTP_PROJECT_KEY=XXX -e ADYEN_API_KEY=XXX -e CTP_CLIENT_ID=XXX -e CTP_CLIENT_SECRET=XXX ctp-adyen-integration-extension:XXX
```
