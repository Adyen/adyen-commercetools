# Integration Guide

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Table of Contents** 

- [Step 1: Set up notification webhook and generate HMAC signature](#step-1-set-up-notification-webhook-and-generate-hmac-signature)
- [Step 2: Deploy the notification module](#step-2-deploy-the-notification-module)
- [Step 3: Processing notifications](#step-3-processing-notifications)
- [Test and go live](#test-and-go-live)
- [FAQ](#faq)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

Notification module is a publicly exposed service which receives asynchronous notifications sent by Adyen, 
Through notifications, Adyen provides asynchronously payment status changes like authorization, charge, or refund of the payment.
The notification module will process the notification and update the matching commercetools payment accordingly.

The following diagram shows the integration flow of the notification module based on [Adyen Notification webhooks](https://docs.adyen.com/development-resources/webhooks).

![Flow](https://user-images.githubusercontent.com/3469524/86772029-85ede380-c053-11ea-8ca2-93703b3227c7.jpg)

## Step 1: Set up notification webhook and generate HMAC signature
You have to register the Notification module `public URL` in the Adyen Customer Area in order to receive notifications.
To protect your server from unauthorized notifications, we strongly recommend that you activate Hash-based message authentication code (HMAC) signatures during the setup.

Please follow the [instructions](https://docs.adyen.com/development-resources/webhooks#set-up-notifications-in-your-customer-area) described by Adyen to set up notifications in your live Customer Area.

> Note: HMAC verification is enabled by default. You could use "ADYEN_ENABLE_HMAC_SIGNATURE=false" environment variable to disable the verification feature.

## Step 2: Deploy the notification module
In order to make the extension module up and running, follow our [deployment guide](./DeploymentGuide.md).

## Step 3: Processing notifications
Adyen sends notifications which look like this:

``` json
{
  "live": "false",
  "notificationItems": [
    {
      "NotificationRequestItem": {
        "additionalData": {
          "hmacSignature":"cjiTz03EI0jkkysGDdPJQdLbecRVVU/5jm12/DTFEHo="
        },
        "amount": {
          "currency": "EUR",
          "value": 10100
        },
        "eventCode": "AUTHORISATION",
        "eventDate": "2019-01-30T18:16:22+01:00",
        "merchantAccountCode": "XXX",
        "merchantReference": "YYY",
        "operations": [
          "CANCEL",
          "CAPTURE",
          "REFUND"
        ],
        "paymentMethod": "visa",
        "pspReference": "test_AUTHORISATION_1",
        "success": "true"
      }
    }
  ]
}

```

Each notification contains an `eventCode` that specifies which type of event triggered the notification. 
Notification module maps this `eventCode` and `success` pair to
commercetools [transactionType](https://docs.commercetools.com/http-api-projects-payments#transactiontype)
and [transactionState](https://docs.commercetools.com/http-api-projects-payments#transactionstate). 

> All mappings can be found in the [adyen-events.json](./../resources/adyen-events.json) file.

After finding a mapping the notification module will find a proper payment on a commercetools project.

If there is no transaction on the payment with the received `transactionType` 
the notification module will create a transaction with the received `transactionType` and
`transactionState`. Otherwise, it will update the existing transaction with a new `transactionState`.

Received notification will be stored on the [interfaceInteraction](https://docs.commercetools.com/http-api-projects-payments#add-interfaceinteraction) of the payment.
If the mapping for the received notification not found then payment will be updated only with a new `interfaceInteraction`.
If payment not found then the notification will be skipped from processing.

## Test and go live
Before you go live please follow the official Adyen [go-live checklist](https://docs.adyen.com/development-resources/webhooks#test-and-go-live).

## FAQ

Can I remove a subscription I created?

- If you accidentally created a subscription you can edit it and uncheck the **Active** checkbox so Adyen doesn't
send notifications. Then you can contact the Adyen support and ask them to remove the subscription

Will we lose a notification if it was not processed for some reason?
- Adyen will queue notifications when the notification service was not reachable or it didn't return a success message and will try to send it later.
