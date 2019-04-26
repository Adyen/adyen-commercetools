# Development guide

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Contents**

- [Requirements](#requirements)
- [Run Module](#run-module)
- [Run Tests](#run-tests)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Requirements
Node.js version 8 LTS or higher is supported.

## Run Module
Execute `npm сi` to download all dependencies.

In order to run the notification module, you have to provide following environmental variables:

Name | Content | Required | Default value
------------ | ------------- | ------------- | -------------
CTP_PROJECT_KEY | commercetools project key (you can get in the [commercetools Merchant Center](https://mc.commercetools.com)) | **YES** |
CTP_CLIENT_ID | commercetools client ID with `manage_types` and `manage_payments` scopes (you can get in the [commercetools Merchant Center](https://mc.commercetools.com)) | **YES** |
CTP_CLIENT_SECRET | commercetools client secret (you can get in the [commercetools Merchant Center](https://mc.commercetools.com)) | **YES** |
LOG_LEVEL | bunyan log level (`trace`, `debug`, `info`, `warn`, `error`, `fatal`)| NO | `info`
PORT | port on which the application will run | NO | 443
KEEP_ALIVE_TIMEOUT | milliseconds to keep a socket alive after the last response ([Node.js docs](https://nodejs.org/dist/latest-v8.x/docs/api/http.html#http_server_keepalivetimeout)) | NO | Node.js default

Don't forget to provide all required environment variables
After setting all variables, execute command `npm run start` to run the module.

## Run Tests

- Execute `npm run unit-test` to run [Unit tests](../test/unit)
- Execute `npm run integration-test` to run [Integration tests](../test/integration) (all required environment variables must be set)

Execute `npm run test` to run all tests

In the end, a code coverage report will be printed.
