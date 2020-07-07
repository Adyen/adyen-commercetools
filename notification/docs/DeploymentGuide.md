# Deployment Guide

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Table of Contents**  

- [Environment variables](#environment-variables)
  - [Adyen](#adyen)
  - [commercetools](#commercetools)
  - [Other Configurations](#other-configurations)
- [Deployment](#deployment)
  - [Docker](#docker)
    - [Running the Docker image](#running-the-docker-image)
  - [AWS Lambda](#aws-lambda)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Environment variables
Following environment variables must be provided in order to run the notification module.

### Adyen

| Name | Content | Required | Default value |
| --- | --- | --- | --- |
|`ADYEN_ENABLE_HMAC_SIGNATURE` | Verify the integrity of notifications using [Adyen HMAC signatures](https://docs.adyen.com/development-resources/webhooks/verify-hmac-signatures). | NO | `true` |
|`ADYEN_SECRET_HMAC_KEY` | The generated secret HMAC key that is linked to a Adyen **Standard Notification** endpoint | NO | |

### commercetools

If you don't have the commercetools OAuth credentials,[create a commercetools API Client](https://docs.commercetools.com/getting-started.html#create-an-api-client).
> Notification module's recommended [scope](https://docs.commercetools.com/http-api-scopes#manage_projectprojectkey) is `manage_project`.

| Name | Content | Required | Default value |
| --- | --- | --- | --- |
|`CTP_PROJECT_KEY` | The unique `key` of the commercetools project. |  YES | |
|`CTP_CLIENT_ID` |  OAuth 2.0 `client_id` and can be used to obtain a token. | YES | |
|`CTP_CLIENT_SECRET` |  OAuth 2.0 `client_secret` and can be used to obtain a token.  | YES | |
|`CTP_HOST` | The commercetools HTTP API is hosted at that URL. | NO | `https://api.europe-west1.gcp.commercetools.com` |
|`CTP_AUTH_URL` | The commercetools’ OAuth 2.0 service is hosted at that URL.  | NO | `https://auth.europe-west1.gcp.commercetools.com` |

### Other Configurations

| Name | Content | Required | Default value |
| --- | --- | --- | --- |
|`PORT` | Th port number on which the application will run. | NO | 8080 |
|`LOG_LEVEL` | The log level (`trace`, `debug`, `info`, `warn`, `error`, `fatal`).| NO | `info` |
|`KEEP_ALIVE_TIMEOUT` | Milliseconds to keep a socket alive after the last response ([Node.js docs](https://nodejs.org/dist/latest-v12.x/docs/api/http.html#http_server_keepalivetimeout)). | NO | Node.js default (5 seconds)

## Deployment

Notification module supports different deployment options. It could be either hosted on-premises (run docker containers behind the load balancer) or deployed as a serverless application with AWS Lambda.
 
### Docker
Refer to our [docker hub](https://hub.docker.com/r/commercetools/commercetools-adyen-integration-notification/tags) page to see the latest releases and tags.

#### Running the Docker image

```bash
    docker run \
    -e ADYEN_SECRET_HMAC_KEY=xxxxxx \
    -e CTP_PROJECT_KEY=xxxxxx \
    -e CTP_CLIENT_ID=xxxxxx \
    -e CTP_CLIENT_SECRET=xxxxxx \
    commercetools/commercetools-adyen-integration-notification
```

### AWS Lambda

For deployment to AWS Lambda, zip the `notification` folder and specify `src/lambda.js` as the entry point for the AWS Lambda function.
