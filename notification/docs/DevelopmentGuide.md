# Development guide

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Contents**

- [Prerequisites](#prerequisites)
- [Run Module](#run-module)
- [Run Tests](#run-tests)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Prerequisites
1. Install Node.js >=8
1. Install npm >=6
1. Run `npm сi`

## Run Module
In order to run the notification module, you have to provide following environmental variables:

Name | Content | Required | Default value
------------ | ------------- | ------------- | -------------
CTP_PROJECT_KEY | commercetools project key (you can get in the [commercetools Merchant Center](https://mc.commercetools.com)) | **YES** |
CTP_CLIENT_ID | commercetools client ID (you can get in the [commercetools Merchant Center](https://mc.commercetools.com)) | **YES** |
CTP_CLIENT_SECRET | commercetools client secret (you can get in the [commercetools Merchant Center](https://mc.commercetools.com)) | **YES** |
LOG_LEVEL | bunyan log level (`trace`, `debug`, `info`, `warn`, `error`, `fatal`)| NO | `info`
PORT | port on which the application will run | NO | 443

After setting all variables, execute command `npm run start` to run the module.

## Run Tests

There are 2 different types of tests. Don't forget to provide all required environmental variables:
1. [Unit tests](../test/unit) - these tests are mocking all external communications.
1. [Integration tests](../test/integration) - these tests interacts with real 3rd party systems.

To run all tests execute 

```
npm run test
```

In the end a code coverage report will be printed.
