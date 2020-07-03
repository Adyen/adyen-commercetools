# Deployment Guide

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Table of Contents**  

- [Environment variables](#environment-variables)
- [Requirements for the commercetools project](#requirements-for-the-commercetools-project)
  - [Creating resources manually](#creating-resources-manually)
- [Deployment](#deployment)
  - [Docker](#docker)
    - [Running the Docker image](#running-the-docker-image)
  - [AWS Lambda](#aws-lambda)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Environment variables
Following environment variables must be provided in order to run the extension module.

| Name | Content | Required | Default value |
| --- | --- | --- | --- |
|`ADYEN_MERCHANT_ACCOUNT` | Adyen Account Code. Go to [Account/Merchant accounts](https://ca-test.adyen.com/ca/ca/accounts/show.shtml?accountTypeCode=MerchantAccount) and get the name in Account code. | YES | |
|`ADYEN_API_KEY` | Go to [Account/Users](https://ca-test.adyen.com/ca/ca/config/users.shtml) - Select a user with `Web Service` User type -> Generate New API Key _(notice: in case you get `403 Forbidden` error from Adyen, try to regenerate the key)_. | YES | |
|`ADYEN_API_BASE_URL` | Base URL for Adyen requests | NO | `https://checkout-test.adyen.com/v52` |
|`ADYEN_LEGACY_API_BASE_URL` | Base legacy URL for Adyen requests. Adyen is in the migration process of API URLs and for some actions, the legacy URL has to be used (e.g. cancelOrRefund). | NO | `https://pal-test.adyen.com/pal/servlet/Payment/v52` |
|`CTP_PROJECT_KEY` | Get commercetools credentials from `https://mc.commercetools.com/${your commercetools project ID}/settings/developer/api-clients`. This module needs to CRUD multiple commercetools resources, thus recommended scope is `manage_project`. |  YES | |
|`CTP_CLIENT_ID` | Get commercetools credentials from `https://mc.commercetools.com/${your commercetools project ID}/settings/developer/api-clients`. This module needs to CRUD multiple commercetools resources, thus recommended scope is `manage_project`. | YES | |
|`CTP_CLIENT_SECRET` | Get commercetools credentials from `https://mc.commercetools.com/${your commercetools project ID}/settings/developer/api-clients`. This module needs to CRUD multiple commercetools resources, thus recommended scope is `manage_project`. | YES | |
|`CTP_HOST` | The commercetools HTTP API is hosted at that URL| NO | `https://api.europe-west1.gcp.commercetools.com` |
|`CTP_AUTH_URL` | The commercetools’ OAuth 2.0 service is hosted at that URL | NO | `https://auth.europe-west1.gcp.commercetools.com` |
|`PORT` | port on which the application will run | NO | 8080 |
|`LOG_LEVEL` | bunyan log level (`trace`, `debug`, `info`, `warn`, `error`, `fatal`)| NO | `info` |
|`API_EXTENSION_BASE_URL` | URL of the Extension module server. In case of any payment changes, [commercetools API extension](https://docs.commercetools.com/http-api-projects-api-extensions) will call this URL and pass the payment object in body. | YES | |
|`KEEP_ALIVE_TIMEOUT` | milliseconds to keep a socket alive after the last response ([Node.js docs](https://nodejs.org/dist/latest-v8.x/docs/api/http.html#http_server_keepalivetimeout)) | NO | Node.js default
|`ENSURE_RESOURCES` | Set to `false` to disable the creation of required resources in commercetools (e.g. custom types) on startup | NO | `true`

> Note: Sometimes it's necessary to regenerate the `ADYEN_API_KEY` key, otherwise you'll get `403 Forbidden error` from Adyen.

## Requirements for the commercetools project
Resources below are required for the extension module to operate correctly. Resources that ***will be automatically created*** by the extension module in your commercetools project.

1. [The commercetools HTTP API Extension pointing to Adyen extension module](../resources/api-extension.json)
1. [Payment custom type](../resources/web-components-payment-type.json)
1. [Payment-interface-interaction custom type](../resources/payment-interface-interaction-type.json)

### Creating required resources manually
 
You can create these by running the command `npm run create-custom-types` as below:

``` bash

    CTP_PROJECT_KEY="xxxxxx" \ 
    CTP_CLIENT_ID="xxxxxx" \ 
    CTP_CLIENT_SECRET="xxxxxx" \
    npm run create-custom-types
```

You will also need [create the commercetools HTTP API extension manually](https://docs.commercetools.com/http-api-projects-api-extensions#create-an-extension) for payment resource.
Please refer to our [Extension Draft](../resources/api-extension.json) for the sample extension draft and replace `${ctpAdyenIntegrationBaseUrl}` with your publicly available HTTPs URL endpoint.

## Deployment

Extension module supports different deployment options, you could deploy the extension module in your servers as 
a docker container or you could use the AWS Lambda as a serverless option which lets you run code without provisioning or managing servers.

### Docker
Refer to our [docker hub](https://hub.docker.com/r/commercetools/commercetools-adyen-integration-extension/tags) page to see the latest releases and tags.

#### Running the Docker image

```bash
    docker run \
    -e ADYEN_MERCHANT_ACCOUNT=xxxxxx \
    -e ADYEN_API_KEY=xxxxxx \
    -e CTP_PROJECT_KEY=xxxxxx \
    -e CTP_CLIENT_ID=xxxxxx \
    -e CTP_CLIENT_SECRET=xxxxxx \
    -e API_EXTENSION_BASE_URL=xxxxxx \
    commercetools/commercetools-adyen-integration-extension
```

### AWS Lambda

1. For deployment to AWS Lambda, zip the extensions folder and specify `src/lambda.handler` as the entry point for the AWS Lambda function.
2. When the extension module is run as AWS Lambda **it will NOT create** the required resources like custom types or commercetools API extension for you. Please follow the [manual resource creation guide](#creating-resources-manually) instead. 
