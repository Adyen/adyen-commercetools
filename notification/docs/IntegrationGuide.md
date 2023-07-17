# Integration Guide

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Step 1: Set up notification webhook and generate HMAC signature](#step-1-set-up-notification-webhook-and-generate-hmac-signature)
- [Step 2: Deploy the notification module](#step-2-deploy-the-notification-module)
- [Step 3: Processing notifications](#step-3-processing-notifications)
- [Test and go live](#test-and-go-live)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

Notification module is a publicly exposed service which receives asynchronous notifications sent by Adyen,
Through notifications, Adyen provides asynchronously payment status changes like authorization, charge, or refund of the payment.
The notification module will process the notification and update the matching commercetools payment accordingly.

The following diagram shows the integration flow of the notification module based on [Adyen Notification webhooks](https://docs.adyen.com/development-resources/webhooks).

![Flow](https://user-images.githubusercontent.com/3469524/86772029-85ede380-c053-11ea-8ca2-93703b3227c7.jpg)

## Step 1: Set up notification webhook and generate HMAC signature

You have to register the Notification module `public URL` in the Adyen Customer Area in order to receive notifications.
To protect your server from unauthorized notifications, we strongly recommend that you activate Hash-based message authentication code (HMAC) signatures during the setup.

You can set up the webhooks and generate HMAC by running the command `npm run setup-resources` as below, the command requires the `ADYEN_INTEGRATION_CONFIG` to be set as an environment variable. For every project you want to generate HMAC key set the attribute `enableHmacSignature: true` and do not have the attribute `secretHmacKey`. The new HMAC key will be generated and the updated `ADYEN_INTEGRATION_CONFIG` will be printed to you. Use this updated `ADYEN_INTEGRATION_CONFIG` to replace the existing one in environment variable and run the notification module. Be aware that this command also sets up [the commercetools resources required for the notification module](./HowToRun.md#commercetools-project-requirements).

(⚠️ When deploying in Connect, it is mandatory for the user to set the `enableHmacSignature` to false, as currently does not support it.)

```bash
export ADYEN_INTEGRATION_CONFIG=xxxx
npm run setup-resources
```

If you want to do the setup manually, please follow the [instructions](https://docs.adyen.com/development-resources/webhooks#set-up-notifications-in-your-customer-area) described by Adyen to set up notifications in your live Customer Area.

> Note: HMAC verification is enabled by default. You could use "enableHmacSignature: false" field in [ADYEN_CONFIG](./HowToRun.md#environment-variable) to disable the verification feature.

### Fallback in case `metadata` is not available

In rare cases it could happen that notifications do not have `metadata.ctProjectKey` field. Without this field it is not possible to determine which commercetools project the notification belongs to. In order to avoid this rare issue, it is recommended to include the commercetools project key in the path of the URL. In this case, the `public URL` for the Notification module must have the following format:

```
https://your-notification-url.com/notifications/${ctp-project-key}
```

Notice that the URL path ends with `/notifications/${ctp-project-key}`, where `ctp-project-key` is the project key of the commercetools project that this notification belongs to. This part must always be in the end. See the following examples:

```
https://your-notification-url.com/some/other/part/notifications/${ctp-project-key} - valid
https://your-notification-url.com/notifications/${ctp-project-key}/some/other/part - invalid
https://your-notification-url.com/notifications/some/other/part/${ctp-project-key} - invalid
https://your-notification-url.com/notifications/${ctp-project-key}/ - invalid (notice `/` in the end of the URL)
```

> Note: if you do not provide `public URL` like above, notification module will still work except for the rare cases.

## Step 2: Deploy the notification module

In order to make the notification module up and running, follow our [how to run guide](./HowToRun.md).

## Step 3: Processing notifications

Adyen sends notifications which look like this:

```json
{
  "live": "false",
  "notificationItems": [
    {
      "NotificationRequestItem": {
        "additionalData": {
          "hmacSignature": "cjiTz03EI0jkkysGDdPJQdLbecRVVU/5jm12/DTFEHo=",
          "metadata.ctProjectKey": "YOUR_COMMERCETOOLS_PROJECT_KEY" // should match a project key in ADYEN_INTEGRATION_CONFIG
        },
        "amount": {
          "currency": "EUR",
          "value": 10100
        },
        "eventCode": "AUTHORISATION",
        "eventDate": "2019-01-30T18:16:22+01:00",
        "merchantAccountCode": "YOUR_MERCHANT_ACCOUNT", // should match a merchant account in ADYEN_INTEGRATION_CONFIG
        "merchantReference": "YOUR_REFERENCE", // should match an existing payment key in commercetools
        "operations": ["CANCEL", "CAPTURE", "REFUND"],
        "paymentMethod": "visa",
        "pspReference": "test_AUTHORISATION_1", // should match a transaction interactionId in commercetools
        "success": "true"
      }
    }
  ]
}
```

As one notification module instance can receive notifications from multiple Adyen merchant accounts and for multiple commercetools projects (so-called multitenancy), it is necessary to have these accounts and projects configured and pass as environment variable `ADYEN_INTEGRATION_CONFIG`. Follow our [how to run guide](./HowToRun.md#environment-variables) for more details.

Each notification contains an `eventCode` that specifies which type of event triggered the notification.
Notification module maps this `eventCode` and `success` pair to
commercetools [transactionType](https://docs.commercetools.com/api/projects/payments#transactiontype)
and [transactionState](https://docs.commercetools.com/api/projects/payments#transactionstate).

> All mappings can be found in the [adyen-events.json](./../resources/adyen-events.json) file.

After finding a mapping the notification module will find a matching payment on a commercetools project.
To find the matching payment, `merchantReference`, `pspReference` and `originalReference` fields from the notification are used to find a payment by key
and `pspReference` field from the notification is used to find a transaction by its interactionId.

If there is no transaction on the payment found,
the notification module will create a new transaction with the received `transactionType` and
`transactionState`. Otherwise, it will update the existing transaction with a new `transactionState`.

Received notification will be stored on the [interfaceInteraction](https://docs.commercetools.com/api/projects/payments#add-interfaceinteraction) of the payment.
If the mapping for the received notification is not found then payment will be updated only with a new `interfaceInteraction`.
If payment is not found then the notification will be skipped from processing.

## Test and go live

Before you go live please follow the official Adyen [go-live checklist](https://docs.adyen.com/development-resources/webhooks#test-and-go-live).

- [Please check FAQ guide](../../docs/FAQ.md).
