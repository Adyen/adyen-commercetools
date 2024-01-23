<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Authorisation amount adjustment and extending the period authorisation](#authorisation-amount-adjustment-and-extending-the-period-authorisation)
  - [Amount update](#amount-update)
    - [Prerequisites](#prerequisites)
    - [Steps](#steps)
      - [1. Create payment session with an additional parameter](#1-create-payment-session-with-an-additional-parameter)
      - [2. Authorize the payment](#2-authorize-the-payment)
      - [3. Amount updates request](#3-amount-updates-request)
      - [4. Process notification](#4-process-notification)
  - [Extend the period of the authorisation](#extend-the-period-of-the-authorisation)
  - [Updating amount multiple times](#updating-amount-multiple-times)
  - [Possible issues](#possible-issues)
  - [Sources](#sources)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# Authorisation amount adjustment and extending the period authorisation

Sometimes you may want to change the amount or extend the period of the authorisation. You can use `amountUpdates` endpoint for this. There are also [test cases available for all the described flows](../test/integration/amount-updates.handler.spec.js).

## Amount update

### Prerequisites

1. In order to update the amount, do not have immediate capture. You can disable Immediate capture in the Adyen Customer area or add a parameter `captureDelayHours` to `createSessionRequest`. For details see the [Adyen documentation](https://docs.adyen.com/online-payments/capture#manual-capture).

2. It is required to [set up notifications URL with CTP project key](/notification/docs/IntegrationGuide.md#fallback-in-case-metadata-is-not-available). The reason is notifications for amount updates do not contain `metadata` and thus the corresponding project key must be obtained from the URL path.

### Steps

#### 1. Create payment session with an additional parameter

In order to enable amount adjustment, create a payment session and additionally specify

```
additionalData.authorisationType: PreAuth
```

<details>
<summary>
An example of payment [setCustomField](https://docs.commercetools.com/api/projects/payments#update-payment) action for `createSessionRequest` with additionalData field.
</summary>

```json
{
  "version": "PAYMENT_VERSION",
  "actions": [
    {
      "action": "setCustomField",
      "name": "createSessionRequest",
      "value": "{ \"amount\": { \"currency\": \"EUR\", \"value\": 1000 }, \"reference\": \"YOUR_REFERENCE\", \"channel\": \"Web\", \"returnUrl\": \"https://your-company.com/...\", \"merchantAccount\": \"YOUR_MERCHANT_ACCOUNT\", \"additionalData\": { \"authorisationType\": \"PreAuth\" } }"
    }
  ]
}
```

</details>

#### 2. Authorize the payment

To update the amount, it is necessary to get `NotificationRequestItem` and obtain the `pspReference`. The `NotificationRequestItem` can be obtained from `interfaceInteractions` field of payment in Commercetools platform.

<details>
<summary>Example of the NotificationRequestItem </summary>

```json
[
  {
    "NotificationRequestItem": {
      "amount": {
        "currency": "EUR",
        "value": 1000
      },
      "eventCode": "AUTHORISATION",
      "eventDate": "2023-02-16T16:38:30+01:00",
      "merchantAccountCode": "CommercetoolsGmbHDE775",
      "merchantReference": "1676561900272",
      "operations": ["CANCEL", "CAPTURE", "REFUND"],
      "paymentMethod": "mc",
      "pspReference": "DC89W6C4VMK2WN82",
      "success": "true"
    }
  }
]
```

</details>

<details>
<summary>The commercetools payment representation example with NotificationRequestItem </summary>

```json
{

  "key": "YOUR_PAYMENT_KEY",
  "amountPlanned": {
    "type": "centPrecision",
    "currencyCode": "EUR",
    "centAmount": 1000,
    "fractionDigits": 2
  },

  ...

  "interfaceInteractions": [
    ...

      {
        "type": {
          "typeId": "type",
          "id": "ab5d881c-b2c0-44c9-a8de-767f668a6f75"
        },
        "fields": {
          "createdAt": "2023-02-16T15:38:30.586Z",
          "status": "authorisation",
          "type": "notification",
          "notification": "{\"NotificationRequestItem\":{\"amount\":{\"currency\":\"EUR\",\"value\":1000},\"eventCode\":\"AUTHORISATION\",\"eventDate\":\"2023-02-16T16:38:30+01:00\",\"merchantAccountCode\":\"CommercetoolsGmbHDE775\",\"merchantReference\":\"1676561900272\",\"operations\":[\"CANCEL\",\"CAPTURE\",\"REFUND\"],\"paymentMethod\":\"mc\",\"pspReference\":\"DC89W6C4VMK2WN82\",\"success\":\"true\"}}"
        }
      },

     ...
  ]
}
```

</details>

#### 3. Amount updates request

To update the amount from the create session request, [set `amountUpdatesRequest` custom field](https://docs.commercetools.com/api/projects/payments#update-payment). This field should contain the fields as described in the Adyen documentation. Be aware that `amount` is the sum of the current amount + additional amount.
Additionally, it must contain `paymentPspReference` field. `paymentPspReference` field contains `pspReference` from the pre-authorisation response (e.g. from `interactionInterface` field of created payment`). How such response could look like see [the previous point](#2-authorize-the-payment).

<details>
<summary>An example of payment setCustomField action for amountUpdatesRequest.</summary>

```json
{
  "version": "PAYMENT_VERSION",
  "actions": [
    {
      "action": "setCustomField",
      "name": "amountUpdatesRequest",
      "value": "{\"amount\":{\"currency\":\"EUR\",\"value\":1000},\"industryUsage\":\"delayedCharge\",\"reference\":\"YOUR_PAYMENT_REFERENCE\",\"merchantAccount\":\"YOUR_MERCHANT_ACCOUNT\", \"paymentPspReference\":\"853592567856061C\"}"
    }
  ]
}
```

</details>

After making the request, the Extension module saves a response into a custom field `amountUpdatesResponse`. Be aware that this response only indicates the request was accepted by Adyen.

<details>
<summary>Example of the formatted JSON value of `amountUpdatesResponse` field</summary>

```json
{
  "merchantAccount": "YOUR_MERCHANT_ACCOUNT",
  "paymentPspReference": "AUTHORIZATION_RESPONSE_PSP_REFERENCE",
  "pspReference": "NEW_PSP_REFERENCE",
  "reference": "YOUR_PAYMENT_REFERENCE",
  "status": "received",
  "amount": {
    "currency": "EUR",
    "value": 1000
  }
}
```

</details>

The response does not confirm the request was successfully processed or not. For the confirmation you have to wait for the notification.

#### 4. Process notification

A notification comes to confirm if the amount update was successful or not. Only after the successful notification you can be sure that amount update is finished.

<details>
<summary>
Example of a successful notification
</summary>

```json
[
  {
    "NotificationRequestItem": {
      "additionalData": {
        "bookingDate": "2022-06-25T14:57:31Z"
      },
      "amount": {
        "currency": "EUR",
        "value": 1000
      },
      "eventCode": "AUTHORISATION_ADJUSTMENT",
      "eventDate": "2022-06-25T14:56:53+02:00",
      "merchantAccountCode": "YOUR_MERCHANT_ACCOUNT",
      "merchantReference": "YOUR_PAYMENT_REFERENCE",
      "originalReference": "PSP_REFERENCE_FROM_THE_AMOUNT_UPDATES_RESPONSE",
      "paymentMethod": "visa",
      "pspReference": "NEW_PSP_REFERENCE",
      "reason": "",
      "success": "true"
    }
  }
]
```

</details>

## Extend the period of the authorisation

To extend the period of the authorisation, set [`amountUpdatesRequest` custom field as described above](#3-amount-updates-request). Set `amount` as the current balance on the authorisation:

- If you haven't adjusted the authorisation yet, use the amount from the original pre-authorisation request.
- If you did adjust the authorisation, use the amount from the last amount updates request.

## Updating amount multiple times

To do `amountUpdatesRequest` multiple times, you need to remove the custom field `amountUpdatesResponse` from the payment when setting the new `amountUpdatesRequest`.

<details>
<summary>Example of updating amount repeatedly</summary>

```json
{
  "version": "PAYMENT_VERSION",
  "actions": [
    {
      "action": "setCustomField",
      "name": "amountUpdatesRequest",
      "value": "{\"amount\":{\"currency\":\"EUR\",\"value\":1000},\"industryUsage\":\"delayedCharge\",\"reference\":\"YOUR_PAYMENT_REFERENCE\",\"merchantAccount\":\"YOUR_MERCHANT_ACCOUNT\"}"
    },
    {
      "action": "setCustomField",
      "name": "amountUpdatesResponse"
    }
  ]
}
```

</details>

## Possible issues

1. Unsuccessful notification with a reason `Insufficient balance on payment`
   <details>
   <summary>Example of the error notification</summary>

   ```json
   {
     "NotificationRequestItem": {
       "additionalData": {
         "bookingDate": "2022-06-12T16:31:30Z"
       },
       "amount": {
         "currency": "EUR",
         "value": 10
       },
       "eventCode": "AUTHORISATION_ADJUSTMENT",
       "eventDate": "2022-06-12T16:30:54+02:00",
       "merchantAccountCode": "YOUR_MECHANT_ACCOUNT",
       "merchantReference": "YOUR_MERCHANT_REFERENCE",
       "originalReference": "ORIGINAL_REFERENCE",
       "pspReference": "PSP_REFERENCE",
       "reason": "Insufficient balance on payment",
       "success": "false"
     }
   }
   ```

   </details>

   > Verify if you have automatic capture disabled. You can also set `captureDelayHours` parameter in the `createSessionRequest`. For more info see https://docs.adyen.com/online-payments/capture#automatic-capture

1. Notification module returns an error `"Notification can not be processed as \"metadata.ctProjectKey\" was not found on the notification nor the path is containing the commercetools project key.",`
   > Check if the notification received from Adyen contains a field called `metadata.ctProjectKey`. This field is currently unavailable for `AUTHORISATION_ADJUSTMENT` notifications. Please [set up notifications URL with CTP project key](/notification/docs/IntegrationGuide.md#fallback-in-case-metadata-is-not-available).

## Sources

https://docs.adyen.com/online-payments/adjust-authorisation
