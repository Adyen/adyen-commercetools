# Integration of payment into checkout process

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Contents**

  - [Glossary](#glossary)
  - [Requirements for CTP project:](#requirements-for-ctp-project)
  - [Required parameters](#required-parameters)
- [Checkout steps](#checkout-steps)
- [Validations](#validations)
    - [Validate cart state](#validate-cart-state)
    - [Recalculate cart](#recalculate-cart)
    - [Validate payment](#validate-payment)
    - [Validate payment transaction](#validate-payment-transaction)
    - [Mapping from Adyen result codes to CTP transaction state](#mapping-from-adyen-result-codes-to-ctp-transaction-state)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Glossary
In this process, there are 2 parties involved:

**Adyen** - the payment provider which will send notifications
**Notification module** - hosted service that accepts notifications from Adyen,
processes and stores on a commercetools platform project.  

## Requirements 

#### for CTP project:
[An `interfaceInteractions` custom type](../resources/payment-interface-interaction-types.json) should be ensured on the Notification module start

#### for the Node.js:
The application supports all versions of Node.js starting the LTS version 8.


## Environment variables to configure the module:
Name | Content | Required | Default value
------------ | ------------- | ------------- | -------------
CTP_PROJECT_KEY | commercetools project key (you can get in the commercetools Merchant Center) | **YES** |
CTP_CLIENT_ID | commercetools client ID (you can get in the commercetools Merchant Center) | **YES** |
CTP_CLIENT_SECRET | commercetools client secret (you can get in the commercetools Merchant Center) | **YES** |
LOG_LEVEL | bunyan log level (`trace`, `debug`, `info`, `warn`, `error`, `fatal`)| NO | `info`
PORT | port on which the application will run | NO | 443

# After deployment

After deploying the module and getting a static public endpoint address
you have to register it in the Adyen Customer Area in order to receive notifications.

## Register the endpoint
 1. Go to your Adyen Customer Area.
 1. Hover **Account** in the menu and select **Server communication**
![image](https://user-images.githubusercontent.com/9251453/55414133-e5b13100-556a-11e9-89ac-a9ebbf72bfdf.png)
 1. You will see the list of available notifications. Click on **add** button of the
"Standard notification".
 1. In the opened form change the **URL** under the **Transport** section to the one
 which exposes the notification module
 1. Select the **Active** checkbox under the same section
 1. Click on **Save Configuration** button below to complete subscription

## Note
- If you accidentally created a subscription you can edit it and uncheck the **Active** checkbox so Adyen doesn't
send there notifications. Then you can contact the Adyen support and ask them to remove the subscription.
- Adyen will queue notifications when the notification service was not reachable or it didn't return a success message
  and will try to send it later.
