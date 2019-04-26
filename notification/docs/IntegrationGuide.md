# Integration of payment into checkout process

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Contents**

  - [Glossary](#glossary)
  - [Requirements](#requirements)
- [Deployment](#deployment)
      - [Environment variables to configure the notification module:](#environment-variables-to-configure-the-notification-module)
  - [Deployment using Docker image](#deployment-using-docker-image)
      - [Pull the image](#pull-the-image)
      - [Run the container](#run-the-container)
- [Configuration](#configuration)
    - [Register the endpoint](#register-the-endpoint)
- [FAQ](#faq)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

### Glossary
In this process, there are 2 parties involved:

 - **Adyen** - the payment provider which will send notifications
 - **Notification module** - hosted service that receives notifications from Adyen,
processes and stores them on a commercetools platform project.

### Requirements 
Node.js version 8 LTS or higher is supported.

## Deployment

##### Environment variables to configure the notification module:
Name | Content | Required | Default value
------------ | ------------- | ------------- | -------------
CTP_PROJECT_KEY | commercetools project key (you can get in the commercetools Merchant Center) | **YES** |
CTP_CLIENT_ID | commercetools client ID (you can get in the commercetools Merchant Center) | **YES** |
CTP_CLIENT_SECRET | commercetools client secret (you can get in the commercetools Merchant Center) | **YES** |
LOG_LEVEL | bunyan log level (`trace`, `debug`, `info`, `warn`, `error`, `fatal`)| NO | `info`
PORT | port on which the application will run | NO | 443
KEEP_ALIVE_TIMEOUT | milliseconds to keep a socket alive after the last response ([Node.js docs](https://nodejs.org/dist/latest-v8.x/docs/api/http.html#http_server_keepalivetimeout)) | NO | Node.js default

Check out the deployment [Best Practices documentation](../../docs/BEST_PRACTICES.md)


### Deployment using Docker image
For easy deployment you can use the [Notification module docker image](https://hub.docker.com/r/commercetools/commercetools-adyen-integration-notification/tags).

##### Pull the image 
```
docker pull commercetools/commercetools-adyen-integration-notification:X.X.X
```
(replace X.X.X with a image tag)

##### Run the container

Replace all `XXX` values and execute:
```
docker run -e CTP_PROJECT_KEY=XXX -e CTP_CLIENT_ID=XXX -e CTP_CLIENT_SECRET=XXX ctp-adyen-integration-notification:XXX
```

## Configuration

After deployment you have to register the Notification module public URL in the Adyen Customer Area in order to receive notifications.

#### Register the endpoint
 1. Go to your [Adyen Customer Area](https://ca-live.adyen.com/ca/ca/login.shtml)
 1. Hover **Account** in the menu and select **Server communication**
![image](https://user-images.githubusercontent.com/9251453/55414133-e5b13100-556a-11e9-89ac-a9ebbf72bfdf.png)
 1. You will see the list of available notifications. Click on **add** button of the
"Standard notification"
 1. In the opened form change the **URL** under the **Transport** section to the one
 which exposes the notification module
 1. Select the **Active** checkbox under the same section
 1. Click on **Save Configuration** button below to complete subscription
 
Check out the Adyen documentation on how to set up notifications for more information: [Set up notifications](https://docs.adyen.com/developers/development-resources/notifications/set-up-notifications)

## FAQ

Can I remove a subscription I created?

- If you accidentally created a subscription you can edit it and uncheck the **Active** checkbox so Adyen doesn't
send there notifications. Then you can contact the Adyen support and ask them to remove the subscription

Will we lose a notification if it was not processed for some reason?
- Adyen will queue notifications when the notification service was not reachable or it didn't return a success message
  and will try to send it later
