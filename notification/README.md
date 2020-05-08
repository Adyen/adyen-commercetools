# Notification Module
![Docker Pulls](https://img.shields.io/docker/pulls/commercetools/commercetools-adyen-integration-notification)

Notification module is a part of the commercetools Adyen integration
which is responsible for receiving notifications from Adyen payment service provider,
processing and storing them on a commercetools platform project.

![image](https://user-images.githubusercontent.com/9251453/56137277-bbad3500-5f94-11e9-8559-7d46113dbbf6.png)

Check out the [Integration Guide](./docs/IntegrationGuide.md) for more information on how to deploy and configure the notification module

Check out the [Development Guide](./docs/DevelopmentGuide.md) for more information on how to install dependencies and run tests

### Processing notifications
Adyen sends notifications which look like this:

```
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

Notification module maps `eventCode` and `success` pair to
commercetools [transactionType](https://docs.commercetools.com/http-api-projects-payments#transactiontype)
and [transactionState](https://docs.commercetools.com/http-api-projects-payments#transactionstate).

All mappings can be found in the [adyen-events.json](./resources/adyen-events.json) file.

After finding a mapping the Notification module will find a proper
payment on a commercetools project.

If there is no transaction on the payment with the received `transactionType`
the Notification module will create a transaction with the received `transactionType` and
`transactionState`. Otherwise it will update the existing transaction with a new `transactionState`.

Received notification will be stored on the [interfaceInteraction](https://docs.commercetools.com/http-api-projects-payments#add-interfaceinteraction) of the payment.

If mapping for the received notification was not found then payment will be updated only with a new `interfaceInteraction`.

If payment was not found then the notification will be skipped from processing.
