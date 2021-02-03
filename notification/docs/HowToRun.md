# Deployment Guide

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

**Table of Contents**

- [Environment variables](#environment-variables)
  - [Adyen](#adyen)
  - [commercetools](#commercetools)
  - [Other Configurations](#other-configurations)
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
      "clientId": "xxx1",
      "clientSecret": "xxx1"
    },
    "commercetoolsProjectKey2": {
      "clientId": "xxx2",
      "clientSecret": "xxx2"
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
  "logLevel": "DEBUG",
  "port": "8081",
  "keepAliveTimeout": 10000
}
```

The JSON structure will be described in details in the next sections of this documentation.

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

| Name                      | Content                                                                                                                                            | Required | Default value |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------- |
| `enableHmacSignature`     | Verify the integrity of notifications using [Adyen HMAC signatures](https://docs.adyen.com/development-resources/webhooks/verify-hmac-signatures). | NO       | `true`        |
| `secretHmacKey`           | The generated secret HMAC key that is linked to a Adyen \*\*Standard                                                                               |
| Notification\*\* endpoint | NO                                                                                                                                                 |          |

### commercetools

If you don't have the commercetools OAuth
credentials,[create a commercetools API Client](https://docs.commercetools.com/getting-started.html#create-an-api-client)
.

> Notification module's recommended [scope](https://docs.commercetools.com/http-api-scopes#manage_projectprojectkey) is `manage_project`.

Multiple child attributes can be provided in the `commercetools` attribute. Each direct child attribute must represent 1 commercetools project like in the following example:

```
{
  "commercetools": {
    "commercetoolsProjectKey1": {
      "clientId": "xxx1",
      "clientSecret": "xxx1"
    },
    "commercetoolsProjectKey2": {
      "clientId": "xxx2",
      "clientSecret": "xxx2"
      "ensureResources": false,
      "host": "https://api.us-east-2.aws.commercetools.com/"
      "authUrl": "https://auth.us-east-2.aws.commercetools.com/"
    }
  }
}
```

| Name              | Content                                                                                                                 | Required | Default value                                     |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------- |
| `clientId`        | OAuth 2.0 `client_id` and can be used to obtain a token.                                                                | YES      |                                                   |
| `clientSecret`    | OAuth 2.0 `client_secret` and can be used to obtain a token.                                                            | YES      |                                                   |
| `ensureResources` | Set to `false` to disable the creation of required resources in commercetools (e.g. interface interactions) on startup. | NO       | `true`                                            |
| `host`            | The commercetools HTTP API is hosted at that URL.                                                                       | NO       | `https://api.europe-west1.gcp.commercetools.com`  |
| `authUrl`         | The commercetools’ OAuth 2.0 service is hosted at that URL.                                                             | NO       | `https://auth.europe-west1.gcp.commercetools.com` |

### Other Configurations

Other configurations can be set as direct child attributes in the JSON config.

```
{
  "commercetools": {...},
  "adyen": {...},
  "logLevel": "DEBUG",
  "port": 8080,
  "keepAliveTimeout": 10000
}
```

| Name               | Content                                                                                                                                                             | Required | Default value               |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | --------------------------- |
| `port`             | Th port number on which the application will run.                                                                                                                   | NO       | 443                         |
| `logLevel`         | The log level (`trace`, `debug`, `info`, `warn`, `error`, `fatal`).                                                                                                 | NO       | `info`                      |
| `keepAliveTimeout` | Milliseconds to keep a socket alive after the last response ([Node.js docs](https://nodejs.org/dist/latest-v12.x/docs/api/http.html#http_server_keepalivetimeout)). | NO       | Node.js default (5 seconds) |

## Running

### Docker

Refer to our [docker hub](https://hub.docker.com/r/commercetools/commercetools-adyen-integration-notification/tags) page
to see the latest releases and tags.

#### Running the Docker image

```bash
    docker run \
    -e ADYEN_SECRET_HMAC_KEY=xxxxxx \
    -e CTP_PROJECT_KEY=xxxxxx \
    -e CTP_CLIENT_ID=xxxxxx \
    -e CTP_CLIENT_SECRET=xxxxxx \
    commercetools/commercetools-adyen-integration-notification
```

## Deployment

Notification module supports different deployment [options](/deployment-examples). It could be either hosted
on-premises (run docker containers behind the load balancer) or deployed as a serverless application.
