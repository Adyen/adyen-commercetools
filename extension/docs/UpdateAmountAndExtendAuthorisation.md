# Authorisation amount adjustment and extending the period authorisation

Sometimes you may want to change the amount or extend the length of the authorisation. You can use `amountUpdates` endpoint for this.

## Amount update

### Prerequisites

1. In order to update the amount, do not have immediate capture. You can disable Immediate capture in the Adyen Customer area or add a parameter `captureDelayHours` to `makePaymentRequest`. For details see the [Adyen documentation](https://docs.adyen.com/online-payments/capture#manual-capture).

2. It is required to [set up notifications URL with CTP project key](/notification/docs/IntegrationGuide.md#fallback-in-case-metadata-is-not-available). The reason is notifications for amount updates do not contain `metadata` and thus the corresponding project key must be obtained from the URL path.

### Steps

#### 1. Make payment with an additional parameter

In order to enable amount adjustment, make a payment and additionally specify

```
additionalData.authorisationType: PreAuth
```

<details>
<summary>
An example of payment [setCustomField](https://docs.commercetools.com/http-api-projects-payments#update-payment) action for makePaymentRequest with additionalData field.
</summary>

```json
{
  "version": "PAYMENT_VERSION",
  "actions": [
    {
      "action": "setCustomField",
      "name": "makePaymentRequest",
      "value": "{\"amount\":{\"currency\":\"EUR\",\"value\":1000},\"reference\":\"YOUR_REFERENCE\",\"paymentMethod\":{\"type\":\"scheme\",\"encryptedCardNumber\":\"test_4111111111111111\",\"encryptedExpiryMonth\":\"test_03\",\"encryptedExpiryYear\":\"test_2030\",\"encryptedSecurityCode\":\"test_737\"}, \"additionalData\":{\"allow3DS2\":true}, \"channel\":\"Web\", \"origin\":\"https://your-company.com\", \"additionalData\":{\"authorisationType\":\"PreAuth\"}, \"returnUrl\":\"https://your-company.com/...\",\"merchantAccount\":\"YOUR_MERCHANT_ACCOUNT\"}"
    }
  ]
}
```

</details>

#### 2. Authorize the payment

To update the amount, it is necessary to get to `Authorised Response` and obtain the `pspReference`. For some payment methods it is necessary to do multiple steps after Make payment. For the sake of readability these steps won't be described here.

<details>
<summary>Example of the Authorized response</summary>

```json
{
  "pspReference": "853592567856061C",
  "resultCode": "Authorised",
  "amount": {
    "currency": "EUR",
    "value": 1000
  },
  "merchantReference": "YOUR_REFERENCE"
}
```

</details>

#### 3. Amount updates request

To update the amount from the make payment request, set `amountUpdatesRequest` custom field. This field should contain the fields as described in the Adyen documentation. Additionally, it must contain `paymentPspReference` field.
`paymentPspReference` field contains `pspReference` from the previous makePaymentResponse. How such response could look like see [our Web Components Integeration Guide](./WebComponentsIntegrationGuide.md#authorised-response). Be aware that `amount` is the sum of the current amount + additional amount.

<details>
<summary>An example of payment [setCustomField](https://docs.commercetools.com/http-api-projects-payments#update-payment) action for amountUpdatesRequest.</summary>

```json
{
  "version": "PAYMENT_VERSION",
  "actions": [
    {
      "action": "setCustomField",
      "name": "amountUpdatesRequest",
      "value": "{\"amount\":{\"currency\":\"EUR\",\"value\":1000},\"reason\":\"DelayedCharge\",\"reference\":\"YOUR_PAYMENT_REFERENCE\",\"merchantAccount\":\"YOUR_MERCHANT_ACCOUNT\"}"
    }
  ]
}
```

</details>

After making the request, Adyen will save a response into a custom field `amountUpdatesResponse`. Be aware that this response only indicates that the request was accepted by Adyen.

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

## Extend the length of the authorisation

To extend the length of the authorisation, create `amountUpdatesRequest` custom field with the same `amount` as the current balance on the authorisation:

- If you haven't adjusted the authorisation yet, use the amount from the original pre-authorisation request.
- If you did adjust the authorisation, use the amount from the last amount updates request.

Source: https://docs.adyen.com/online-payments/adjust-authorisation?tab=asynchronous_authorisation_adjustment_1#extend-authorisation

### Possible issues

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

In this case verify if you have automatic capture disabled. You can also set `captureDelayHours` parameter in the `makePaymentRequest`. For more info see https://docs.adyen.com/online-payments/capture#automatic-capture
