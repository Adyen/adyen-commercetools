# Deployment Guide

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Environment variable](#environment-variable)
  - [Adyen](#adyen)
  - [commercetools](#commercetools)
  - [Other Configurations](#other-configurations)
- [Commercetools project requirements](#commercetools-project-requirements)
- [Running](#running)
  - [Docker](#docker)
    - [Running the Docker image](#running-the-docker-image)
- [Deployment](#deployment)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Environment variable

Notification module requires 1 environment variable to start. This environment variable name
is `ADYEN_INTEGRATION_CONFIG` and it must contain settings as attributes in a JSON structure.

```
{
  "commercetools": {
    "commercetoolsProjectKey1": {
      "clientId": "xxx",
      "clientSecret": "xxx"
    },
    "commercetoolsProjectKey2": {
      "clientId": "xxx",
      "clientSecret": "xxx"
    }
  },
  "adyen": {
    "adyenMerchantAccount1": {
      "enableHmacSignature": "false"
    },
    "adyenMerchantAccount2": {
      "enableHmacSignature": "true",
      "secretHmacKey": "secretKey"
    }
  },
  "getAdyenPaymentMethodsToNames": {
    "visa": {"en": "Credit card visa"},
    "gpay": {"en": "Google Pay"}
  },
  "logLevel": "DEBUG",
  "port": "8081",
  "keepAliveTimeout": 10000,
  "removeSensitiveData": false
}
```

The JSON structure will be described in detail in the next sections of this documentation.

### Adyen

Multiple child attributes can be provided in the `adyen` attribute. Each direct child attribute must represent 1 adyen
merchant account like in the following example:

```
{
  "adyen": {
    "adyenMerchantAccount1": {
      "enableHmacSignature": "false"
    },
    "adyenMerchantAccount2": {
      "enableHmacSignature": "true",
      "secretHmacKey": "secretKey"
    }
  }
}
```

| Name                  | Content                                                                                                                                            | Required | Default value |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------- |
| `enableHmacSignature` | Verify the integrity of notifications using [Adyen HMAC signatures](https://docs.adyen.com/development-resources/webhooks/verify-hmac-signatures). | NO       | `true`        |
| `secretHmacKey`       | The generated secret HMAC key that is linked to a Adyen **Standard Notification** endpoint                                                         | NO       |               |

### commercetools

If you don't have the commercetools OAuth
credentials,[create a commercetools API Client](https://docs.commercetools.com/getting-started.html#create-an-api-client)
.

> Note that, notification module requires `manage_payments` [scope](https://docs.commercetools.com/http-api-scopes) for the integration and `manage_types` [scope](https://docs.commercetools.com/http-api-scopes) for setting up required resources.

Multiple child attributes can be provided in the `commercetools` attribute. Each direct child attribute must represent 1 commercetools project like in the following example:

```
{
  "commercetools": {
    "commercetoolsProjectKey1": {
      "clientId": "xxx",
      "clientSecret": "xxx"
    },
    "commercetoolsProjectKey2": {
      "clientId": "xxx",
      "clientSecret": "xxx"
      "apiUrl": "https://api.us-east-2.aws.commercetools.com/"
      "authUrl": "https://auth.us-east-2.aws.commercetools.com/"
    }
  }
}
```

| Name           | Content                                                      | Required | Default value                                     |
| -------------- | ------------------------------------------------------------ | -------- | ------------------------------------------------- |
| `clientId`     | OAuth 2.0 `client_id` and can be used to obtain a token.     | YES      |                                                   |
| `clientSecret` | OAuth 2.0 `client_secret` and can be used to obtain a token. | YES      |                                                   |
| `apiUrl`       | The commercetools HTTP API is hosted at that URL.            | NO       | `https://api.europe-west1.gcp.commercetools.com`  |
| `authUrl`      | The commercetools’ OAuth 2.0 service is hosted at that URL.  | NO       | `https://auth.europe-west1.gcp.commercetools.com` |

### Other Configurations

Other configurations can be set as direct child attributes in `ADYEN_INTEGRATION_CONFIG`.

```
{
  "commercetools": {...},
  "adyen": {...},
  "getAdyenPaymentMethodsToNames": {
    "visa": {"en": "Credit card visa"},
    "gpay": {"en": "Google Pay"}
  },
  "logLevel": "DEBUG",
  "port": 8080,
  "keepAliveTimeout": 10000,
  "removeSensitiveData": false
}
```

| Name                         | Content                                                                                                                                                                         | Required | Default value                                                                                         |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------- |
| `adyenPaymentMethodsToNames` | Key-value object where key is `paymentMethod` returned in the notification and value is the custom localized name that will be saved in CTP `payment.paymentMethodInfo.method`. | NO       | `{scheme: {en: 'Credit Card'}, pp: {en: 'PayPal'}, klarna: {en: 'Klarna'}, gpay: {en: 'Google Pay'}}` |
| `port`                       | The port number on which the application will run.                                                                                                                              | NO       | 443                                                                                                   |
| `logLevel`                   | The log level (`trace`, `debug`, `info`, `warn`, `error`, `fatal`).                                                                                                             | NO       | `info`                                                                                                |
| `keepAliveTimeout`           | Milliseconds to keep a socket alive after the last response ([Node.js docs](https://nodejs.org/dist/latest/docs/api/http.html#http_server_keepalivetimeout)).                   | NO       | Node.js default (5 seconds)                                                                           |
| `removeSensitiveData`        | Boolean attribute. When set to "false", Adyen fields with additional information about the payment will be saved in the interface interaction and in the custom fields.         | NO       | true                                                                                                  |

## Commercetools project requirements

Resources below are required for the notification module to operate correctly.

1. [Payment-interface-interaction custom type](../resources/payment-interface-interaction-type.json)

You can create these by running the command `npm run setup-resources` as below, the command requires the `ADYEN_INTEGRATION_CONFIG` to be set as an environment variable.

```bash
export ADYEN_INTEGRATION_CONFIG=xxxx
npm run setup-resources
```

## Running

### Docker

Refer to our [docker hub](https://hub.docker.com/r/commercetools/commercetools-adyen-integration-notification/tags) page
to see the latest releases and tags.

#### Running the Docker image

```bash
    docker run \
    -e ADYEN_INTEGRATION_CONFIG=xxxxxx \
    commercetools/commercetools-adyen-integration-notification:vX.X.X
```

## Deployment

Notification module supports different deployment [options](/deployment-examples). It could be either hosted
on-premises (run docker containers behind the load balancer) or deployed as a serverless application.
