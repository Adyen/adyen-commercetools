# How to run

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

Extension module requires 1 environment variable to start. This environment variable name is `ADYEN_INTEGRATION_CONFIG` and it must contain settings as attributes in a JSON structure.

```json
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
      "apiKey": "xxx"
    },
    "adyenMerchantAccount2": {
      "apiKey": "xxx"
    }
  },
  "paymentMethodsToNamesConfig": {
    "visa": "Credit card visa",
    "gpay": "Google Pay"
  }
}
```

The JSON structure will be described in details in the next sections of this documentation.

### Adyen

- For **test environment** follow the official Adyen [get started guide](https://docs.adyen.com/checkout/get-started) to set up your **test account**, get your API key.
- For **live environment** follow the official Adyen [documentation](https://docs.adyen.com/user-management/get-started-with-adyen#step-2-apply-for-your-live-account) for details.

Multiple child attributes can be provided in the `adyen` attribute. Each direct child attribute must represent 1 adyen merchant account like in the following example:

```
{
  "adyen": {
    "adyenMerchantAccount1": {  // The name of your first merchant account.
      "apiKey": "xxx"
      "apiBaseUrl": "https://checkout-test.adyen.com/v50",
      "legacyApiBaseUrl": "https://pal-test.adyen.com/pal/servlet/Payment/v50"
    },
    "adyenMerchantAccount2": {  // The name of your second merchant account.
      "apiKey": "xxx"
    }
  }
}
```

| Name               | Content                                                                                                                                                  | Required | Default value (only for test environment)            |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ---------------------------------------------------- |
| `apiKey`           | You'll be making API requests that are authenticated with an [API key](https://docs.adyen.com/user-management/how-to-get-the-api-key#page-introduction). | YES      |                                                      |
| `apiBaseUrl`       | [Checkout endpoint](https://docs.adyen.com/development-resources/live-endpoints#checkout-endpoints) of Adyen.                                            | NO       | `https://checkout-test.adyen.com/v52`                |
| `legacyApiBaseUrl` | [Standart payment endpoint](https://docs.adyen.com/development-resources/live-endpoints#standard-payments-endpoints) of Adyen.                           | NO       | `https://pal-test.adyen.com/pal/servlet/Payment/v52` |

> Note: Sometimes it's necessary to regenerate the `apiKey`, when you get `403 Forbidden error` from Adyen.

### commercetools

If you don't have the commercetools OAuth credentials,[create a commercetools API Client](https://docs.commercetools.com/getting-started.html#create-an-api-client).

> Extension module's recommended [scope](https://docs.commercetools.com/http-api-scopes#manage_projectprojectkey) is `manage_project`.

Multiple child attributes can be provided in the `commercetools` attribute. Each direct child attribute must represent 1 commercetools project like in the following example:

```
{
  "commercetools": {
    "commercetoolsProjectKey1": { // commercetools project key of the first project
      "clientId": "xxx",
      "clientSecret": "xxx",
      "host": "https://api.us-east-2.aws.commercetools.com/",
      "authUrl": "https://auth.us-east-2.aws.commercetools.com/",
      "authentication" : {
        "scheme": "basic",
        "username": "xxx",
        "password": "xxx"
      }
    },
    "commercetoolsProjectKey2": { // commercetools project key of the second project
      "clientId": "xxx",
      "clientSecret": "xxx",
      "authentication" : {
        "scheme": "basic",
        "username": "xxx",
        "password": "xxx"
      }
    }
  }
}
```

| Name             | Content                                                                                                                                                                                                                                                                                                                                                                                                      | Required | Default value                                     |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- | ------------------------------------------------- |
| `clientId`       | OAuth 2.0 `client_id` and can be used to obtain a token.                                                                                                                                                                                                                                                                                                                                                     | YES      |                                                   |
| `clientSecret`   | OAuth 2.0 `client_secret` and can be used to obtain a token.                                                                                                                                                                                                                                                                                                                                                 | YES      |                                                   |
| `host`           | The commercetools HTTP API is hosted at that URL.                                                                                                                                                                                                                                                                                                                                                            | NO       | `https://api.europe-west1.gcp.commercetools.com`  |
| `authUrl`        | The commercetools’ OAuth 2.0 service is hosted at that URL.                                                                                                                                                                                                                                                                                                                                                  | NO       | `https://auth.europe-west1.gcp.commercetools.com` |
| `authentication` | This setting only takes effect when `basicAuth` ( a child attribute in `ADYEN_INTEGRATION_CONFIG` ) is set to `true`. It enables authentication mechanism to prevent unauthorized access to the extension module. When it is provided as a JSON object, it must contain 3 separate attributes. They are `scheme` attribute which supports `basic` type, `username` and `password` attribute defined by user. | NO       |                                                   |

### Other Configurations

Other configurations can be set as direct child attributes in `ADYEN_INTEGRATION_CONFIG`.

```
{
  "commercetools": {...},
  "adyen": {...},
  "paymentMethodsToNamesConfig": {
    "klarna": "Klarna payment",
    "gpay": "Google Pay"
  },
  "logLevel": "DEBUG",
  "port": 8080,
  "keepAliveTimeout": 10000,
  "basicAuth" : true
}
```

| Name                          | Content                                                                                                                                                                        | Required | Default value                                               |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- | ----------------------------------------------------------- |
| `paymentMethodsToNamesConfig` | Key-value object where key is `paymentMethod.type` in makePayment Adyen request and value is the customized name that will be saved in CTP `payment.paymentMethodInfo.method`. | NO       | `{ scheme: 'Credit Card', pp: 'PayPal', klarna: 'Klarna' }` |
| `port`                        | The port number on which the application will run.                                                                                                                             | NO       | 8080                                                        |
| `logLevel`                    | The log level (`trace`, `debug`, `info`, `warn`, `error`, `fatal`).                                                                                                            | NO       | `info`                                                      |
| `keepAliveTimeout`            | Milliseconds to keep a socket alive after the last response ([Node.js docs](https://nodejs.org/dist/latest/docs/api/http.html#http_server_keepalivetimeout)).                  | NO       | Node.js default (5 seconds)                                 |
| `basicAuth`                   | Boolean attribute to enable/disable basic authentication to prevent unauthorized 3rd-party from accessing extension endpoint                                                   | NO       | false                                                       |

## Commercetools project requirements

Resources below are required for the extension module to operate correctly.

1. [The commercetools HTTP API Extension pointing to Adyen extension module](../resources/api-extension.json)
   > It's required that the HTTP API Extension timeout limit is increased to 10000 milliseconds (default is 2000). Please contact Support via the commercetools [support portal](https://support.commercetools.com/) and provide the region, project key, and use case to increase the timeout to 10000 ms. Additionally, after the limit increased, timeout might be updated over API with [setTimeoutInMs](https://docs.commercetools.com/http-api-projects-api-extensions#set-timeoutinms) action.
1. [Payment custom type](../resources/web-components-payment-type.json)
1. [Payment-interface-interaction custom type](../resources/payment-interface-interaction-type.json)

First, you will need to configure [ExtensionDraft](../resources/api-extension.json) destination according to your deployment,
A destination contains all info necessary for the commercetools platform to call the extension module. Please follow the [commercetools HTTP API Extension](https://docs.commercetools.com/api/projects/api-extensions#destination) documentation for details.

After you change the destination, you can set up required resources in your commercetools projects by running the script `npm run setup-resources`, the script requires the `ADYEN_INTEGRATION_CONFIG` to be set as an environment variable.

```bash
export ADYEN_INTEGRATION_CONFIG=xxxx
npm run setup-resources
```

## Running

### Docker

Refer to our [docker hub](https://hub.docker.com/r/commercetools/commercetools-adyen-integration-extension/tags) page to see the latest releases and tags.

#### Running the Docker image

```bash
    docker run \
    -e ADYEN_INTEGRATION_CONFIG=xxxxxx \
    commercetools/commercetools-adyen-integration-extension:vX.X.X
```

## Deployment

Extension module supports different deployment [options](/deployment-examples).
It could be either hosted on-premises (run docker containers behind the load balancer) or
deployed as a serverless application.
