# Development and Deployment Guide

**Contents**

- [Prerequisites](#prerequisites)
- [Requirements for CTP project](#requirements-for-ctp-project)
- [Required parameters](#required-parameters)
- [Run Tests](#run-tests)
- [Deployment](#deployment)
  - [AWS Lambda](#aws-lambda)
  - [Docker](#docker)
    - [Pull the image](#pull-the-image)
    - [Run the container](#run-the-container)

## Prerequisites
1. Install Node.js >=12
1. Install npm >=6
1. Run `npm ci`

## Requirements for CTP project
All the requirements below are automatically created by the Extension module.
1. [API Extension subscription to Extension module endpoints](../resources/api-extension.json)
1. [Payment custom type](../resources/web-components-payment-type.json)
1. [Payment-interface-interaction custom type](../resources/payment-interface-interaction-type.json)

**Note**: Extension module will not create if there are already resources with same key in the CTP project. In this case, you have to synchronize by yourself.

## Required Parameters
In order to make the extension module working, following parameters have to be provided to the Extension module:

| Name | Content | Required | Default value |
| --- | --- | --- | --- |
|`ADYEN_MERCHANT_ACCOUNT` | Go to [Account/Merchant accounts](https://ca-test.adyen.com/ca/ca/accounts/show.shtml?accountTypeCode=MerchantAccount) and get the name in Account code. | YES | |
|`ADYEN_API_KEY` | Go to [Account/Users](https://ca-test.adyen.com/ca/ca/config/users.shtml) - Select a user with `Web Service` User type - Generate New API Key (notice: in case you get `403 Forbidden` error from Adyen, try to regenerate the key). | YES | |
|`ADYEN_API_BASE_URL` | Base URL for Adyen requests | NO | `https://checkout-test.adyen.com/v52` |
|`ADYEN_LEGACY_API_BASE_URL` | Base legacy URL for Adyen requests. Adyen is in the migration process of API URLs and for some actions, the legacy URL has to be used (e.g. cancelOrRefund). | NO | `https://pal-test.adyen.com/pal/servlet/Payment/v52` |
|`CTP_PROJECT_KEY` | Get CTP credentials from `https://mc.commercetools.com/${your CTP project ID}/settings/developer/api-clients`. This module needs to CRUD multiple CTP resources, thus recommended scope is `manage_project`. |  YES | |
|`CTP_CLIENT_ID` | Get CTP credentials from `https://mc.commercetools.com/${your CTP project ID}/settings/developer/api-clients`. This module needs to CRUD multiple CTP resources, thus recommended scope is `manage_project`. | YES | |
|`CTP_CLIENT_SECRET` | Get CTP credentials from `https://mc.commercetools.com/${your CTP project ID}/settings/developer/api-clients`. This module needs to CRUD multiple CTP resources, thus recommended scope is `manage_project`. | YES | |
|`CTP_HOST` | commercetools HTTP API is hosted at that URL| NO | `https://api.europe-west1.gcp.commercetools.com` |
|`CTP_AUTH_URL` | commercetools’ OAuth 2.0 service is hosted at that URL | NO | `https://auth.europe-west1.gcp.commercetools.com` |
|`PORT` | port on which the application will run | NO | 8080 |
|`LOG_LEVEL` | bunyan log level (`trace`, `debug`, `info`, `warn`, `error`, `fatal`)| NO | `info` |
|`API_EXTENSION_BASE_URL` | URL of the Extension module server. In case of any payment changes, [CTP API extension](https://docs.commercetools.com/http-api-projects-api-extensions) will call this URL and pass the payment object in body. | YES | |
|`KEEP_ALIVE_TIMEOUT` | milliseconds to keep a socket alive after the last response ([Node.js docs](https://nodejs.org/dist/latest-v8.x/docs/api/http.html#http_server_keepalivetimeout)) | NO | Node.js default
|`ENSURE_RESOURCES` | Set to `false` to disable the creation of resources in commercetools (e.g. custom types) | NO | `true`

## Run Tests
In addition to the environmental variables from [Required parameters](#required-parameters), there's one additional environmental variable:
1. `CLIENT_ENCRYPTION_PUBLIC_KEY`: Get your key from `https://ca-test.adyen.com/ca/ca/config/users.shtml`. Select `Web Service` user type account and copy `Client Encryption Public Key`. This key is used to encrypt credit card credentials in tests.

There are 3 different types of tests. Don't forget to provide all required environmental variables:
1. [Unit tests](../test/unit) - these tests are mocking all external communications.
1. [Integration tests](../test/integration) - these tests interacts with real 3rd party systems.
1. [End to end tests](../test/e2e) - for some payment methods, it's not possible to test without interacting with the UI (e.g. credit card 3ds).

## Deployment

### AWS Lambda

For deployment to lambda zip the extensions folder and specify `src/lambda.handler` as the entry point for the function

When deploying the lambda, it will NOT create the custom types for you. These are required for the extension to operate correctly. Please add [payment custom type](../resources/web-components-payment-type.json) and [payment-interface-interaction custom type](../resources/payment-interface-interaction-type.json) manually.
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
