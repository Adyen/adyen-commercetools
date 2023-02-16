<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Store payment details](#store-payment-details)
  - [Make an API call to store payment details](#make-an-api-call-to-store-payment-details)
    - [One-off payments](#one-off-payments)
    - [Subscriptions](#subscriptions)
    - [Automatic top-ups](#automatic-top-ups)
  - [Delete stored payments](#delete-stored-payments)
  - [Resources](#resources)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

**Please see [Integration Guide](WebComponentsIntegrationGuide.md) first before continuing with this document.**

## Store payment details

With Adyen, you can securely store one or more payment details per shopper. This allows you to offer subscription payments, automatic top-ups to shopper accounts, and give your shoppers a faster checkout experience by using their stored card.

### Make an API call to store payment details

There are a couple of ways how you can store the payment.

#### One-off payments

One-off transactions where a shopper stores payment details or where the shopper purchases from your website or app at a later time using the saved details.

To save payment details for one-off payments, [add following fields to your `createSessionRequest`](./WebComponentsIntegrationGuide.md#step-5-make-a-payment):

- `shopperReference: 'YOUR_SHOPPER_REFERENCE'` - `shopperReference` will be later used for managing the stored payment details.
- `shopperInteraction: Ecommerce`
- `recurringProcessingModel: CardOnFile`
- `storePaymentMethod: true`
- `removeSensitiveData: false` - set this if your adyen-integration is deployed with `removeSensitiveData: true` configuration. The reason is by default stored payment details are returned asynchronously in `additionalData` in notification and this field is being removed when `removeSensitiveData: true`.

<details>
<summary>Click to expand an example `createSessionRequest`</summary>

```json
{
  "amount": {
    "currency": "EUR",
    "value": 1000
  },
  "reference": "YOUR_REFERENCE",
  "channel": "Web",
  "returnUrl": "https://your-company.com/...",
  "merchantAccount": "YOUR_MERCHANT_ACCOUNT",
  "storePaymentMethod": true,
  "shopperReference": "YOUR_SHOPPER_REFERENCE",
  "shopperInteraction": "Ecommerce",
  "recurringProcessingModel": "CardOnFile",
  "removeSensitiveData": false
}
```

</details>

<details>
<summary>The commercetools payment representation example with `createSessionRequest` and `createSessionResponse` with stored payment. Click to expand.</summary>

```json
{
  "key": "YOUR_PAYMENT_KEY",
  "amountPlanned": {
    "type": "centPrecision",
    "currencyCode": "EUR",
    "centAmount": 1000,
    "fractionDigits": 2
  },
  "paymentMethodInfo": {
    "paymentInterface": "ctp-adyen-integration"
  },
  "custom": {
    "type": {
      "typeId": "type",
      "id": "3540c278-dfe9-45a2-94cd-651025019bb2"
    },
    "fields": {
      "createSessionRequest": "{ \"amount\": { \"currency\": \"EUR\", \"value\": 1000 }, \"reference\": \"YOUR_REFERENCE\", \"channel\": \"Web\", \"returnUrl\": \"https://your-company.com/...\", \"merchantAccount\": \"YOUR_MERCHANT_ACCOUNT\", \"storePaymentMethod\": true, \"shopperReference\": \"YOUR_SHOPPER_REFERENCE\", \"shopperInteraction\": \"Ecommerce\", \"recurringProcessingModel\": \"CardOnFile\", \"removeSensitiveData\": false }",
      "adyenMerchantAccount": "YOUR_MERCHANT_ACCOUNT",
      "commercetoolsProjectKey": "YOUR_COMMERCETOOLS_PROJECT_KEY",
      "createSessionResponse": "{ \"amount\": { \"currency\": \"EUR\", \"value\": 1000 }, \"channel\": \"Web\", \"expiresAt\": \"2023-02-16T15:47:27+01:00\", \"id\": \"CS3928DCE007294CB5\", \"merchantAccount\": \"YOUR_MERCHANT_ACCOUNT\", \"recurringProcessingModel\": \"CardOnFile\", \"reference\": \"YOUR_REFERENCE\", \"returnUrl\": \"https://your-company.com/...\", \"shopperInteraction\": \"Ecommerce\", \"shopperReference\": \"YOUR_SHOPPER_REFERENCE\", \"storePaymentMethod\": true, \"mode\": \"embedded\", \"sessionData\": \"Ab02b4c0!BQABAgCKs1UiPmWYsg4oQqVZ/nj6OJbUBqJ9AZx6EwTF4Iq1yc7O51rRYAD6s/IZkPEEZ3CDgvPPdwinmNxEcXV5RtDjixgLjdS2mcT0QtN9gBD2++DTncDnAlHsGSDqY9/+OjmeiJVFI4rIoRfTceNS1t9PubgqFgXSpgpfV+L/8YN1JGHWrG00HSPU6UIAsly+KmRjacsIuYTmdl0l6GjKE8TsKgPSeP0GCCMuk6CD1SVYG5FK43sl1/2SmY3k66lNjjka5Logk/PedlOaPpLlGqjoE12VYmReYlEBRWiV9OVBGsY4NZkZlkCTkTxdIiMg5NPiiKg9l4Cqr2PRVM0JBCyW3rVqRF9boMOaxYlnncUb7AzxH4bPv/SO3XpQN7WeykTONzQUP9ggzkY8z6VPUSsbqqhV2M0JACJe5mxxNA7rnZESqP2/m/gN4udQA0AYqekjo30Ml0GVYwTA6+CoJgd1/XZHJ6vzkYmsvfHy2MO7fcOo8bRbqQ2lV0+igffQ/8UMF0io8LqY4v27yAGZn8NtyCYihdhKTyBkSPv8k1wk+b3mId/IY/bGzbnlXfO46J/coe91+cfd+2rHVKXmcMDvA3GbzCamg2kuNVYyYJblyMEDO2R4Th6JKdBDLinVpCrNIQ+gWDYjC7g5E5PH71uiqDa0ScpUVqHdVMArs6uJrAyFI4E9Ij3vfrvo3pwASnsia2V5IjoiQUYwQUFBMTAzQ0E1MzdFQUVEODdDMjRERDUzOTA5QjgwQTc4QTkyM0UzODIzRDY4REFDQzk0QjlGRjgzMDVEQyJ91yyWone72hpq3xQpI926LCSEWLYruAtVHZHbKg9pITxHO1CNoTjqgJcxMsZ0vDTb0ua+49ReAitMvbCY0fttcRfMMpxBtNksrLHteKRRSUzHyT04fSTbFiRzb1qnDHIRMr9XOHaFuLXGKGggOCpBrI6XXronCogA77Y+0E0yJJdwgvfm4azIPlgoyJsk213bBFpCQIr5pOr9Nje9gsR5JB1bQrpsIa2QBaH8X2eLCPOly3xz1yvE5yifQIjfWo8fT7nO8Wk4qYUXNR+SHFeGzjSvtWD1+OZ9zPEoc4J5eNfKcJ1UFZ/WCEoDu1jyS0n9o8llrNSu/GvNEptc7qGLeCUii1icsBD/OCYDVnR7hy0utMVs3l7j3G+YNvND7BSDB1X74xAUnmjDDZXs/ghgZ6/joVnvXJcEf5DFbACd9Tcw8V2flZ2BP9fmkvBIkaXKA0A0eUn/HLINXDGTn6HQnU37lVX1rjHZ0DrQwGaYptQR5rE/37WIVKiYEgQllZTG6pQecTP3cHrfuuvm0yHeglO2pXBrbH8cI701eH51GEQMa932Xqci0kQLiFD2PzHmOKKD747/Pbl23XGgDFB+vK1efzJe3q5wLwG1BpcP9kR3rfvqNLWfjQDQOmCnRvM=\" }"
    }
  }
}
```

</details>

#### Subscriptions

Let your shoppers set up subscriptions with you. Subscriptions are a series of transactions with fixed or variable amounts, charged at a fixed time interval.

To save payment details for subscription payments, [add following fields to your `createSessionRequest`](./WebComponentsIntegrationGuide.md#step-5-make-a-payment):

- `shopperReference: 'YOUR_SHOPPER_REFERENCE'` - `shopperReference` will be later used for managing the stored payment details.
- `shopperInteraction: Ecommerce`
- `recurringProcessingModel: Subscription`
- `storePaymentMethod: true`
- `removeSensitiveData: false` - set this if your adyen-integration is deployed with `removeSensitiveData: true` configuration. The reason is by default stored payment details are returned asynchronously in `additionalData` in notification and this field is being removed when `removeSensitiveData: true`.

<details>
<summary>Click to expand an example `createSessionRequest`</summary>

```json
{
  "amount": {
    "currency": "EUR",
    "value": 1000
  },
  "reference": "YOUR_REFERENCE",
  "channel": "Web",
  "returnUrl": "https://your-company.com/...",
  "merchantAccount": "YOUR_MERCHANT_ACCOUNT",
  "storePaymentMethod": true,
  "shopperReference": "YOUR_SHOPPER_REFERENCE",
  "shopperInteraction": "Ecommerce",
  "recurringProcessingModel": "Subscription",
  "removeSensitiveData": false
}
```

</details>

<details>
<summary>The commercetools payment representation example with `createSessionRequest` and `createSessionResponse` with stored payment. Click to expand.</summary>

```json
{
  "key": "YOUR_PAYMENT_KEY",
  "amountPlanned": {
    "type": "centPrecision",
    "currencyCode": "EUR",
    "centAmount": 1000,
    "fractionDigits": 2
  },
  "paymentMethodInfo": {
    "paymentInterface": "ctp-adyen-integration"
  },
  "custom": {
    "type": {
      "typeId": "type",
      "id": "3540c278-dfe9-45a2-94cd-651025019bb2"
    },
    "fields": {
      "createSessionRequest": "{ \"amount\": { \"currency\": \"EUR\", \"value\": 1000 }, \"reference\": \"YOUR_REFERENCE\", \"channel\": \"Web\", \"returnUrl\": \"https://your-company.com/...\", \"merchantAccount\": \"YOUR_MERCHANT_ACCOUNT\", \"storePaymentMethod\": true, \"shopperReference\": \"YOUR_SHOPPER_REFERENCE\", \"shopperInteraction\": \"Ecommerce\", \"recurringProcessingModel\": \"Subscription\", \"removeSensitiveData\": false }",
      "adyenMerchantAccount": "YOUR_MERCHANT_ACCOUNT",
      "commercetoolsProjectKey": "YOUR_COMMERCETOOLS_PROJECT_KEY",
      "createSessionResponse": "{ \"amount\": { \"currency\": \"EUR\", \"value\": 1000 }, \"channel\": \"Web\", \"expiresAt\": \"2023-02-16T16:04:47+01:00\", \"id\": \"CS4D91BFAE2C97E92C\", \"merchantAccount\": \"YOUR_MERCHANT_ACCOUNT\", \"recurringProcessingModel\": \"Subscription\", \"reference\": \"YOUR_REFERENCE\", \"returnUrl\": \"https://your-company.com/...\", \"shopperInteraction\": \"Ecommerce\", \"shopperReference\": \"YOUR_SHOPPER_REFERENCE\", \"storePaymentMethod\": true, \"mode\": \"embedded\", \"sessionData\": \"Ab02b4c0!BQABAgCaqpLQFxAw99HQqH9RnmMvScfqT3wIKNu6Wo2X98HgE9Qn6w6omGay7IdoO0A7d0aSCsK8DZ5iSX+yzvn4nooIwSSEj/y0KM/dsvpsUMjTlCRYC937iktK7Q23ey5gprftVe/35nnewDfYiLXEGbn+RR0cQ2dpBSm6IB8f1ECrUTEmGkChorVH73WedI21BqA+XioUw2eXV6+5FTcU0uC834W9UQ2TfZb7MQs8SL7tjMUTCo3H2NLDzzBxn7nvBx2kKa00qIrLP/BBPafZBbsaL/cl6thx6iK22JQcu7UtzMSsdEWSt3n/woLILyMNn38VJxHShqTMuf+mtKn/uaLw/m6Dj3OI4aWVv2aONg3bjtivlS9/ieoQ2Vj8iunW0ZBoERVTmeAUK0KRCfPHbQoGsC/GDSGXCOaaET8y+PP8BhwctC5qPBZUezVXrmQ3S7TmaqA0uD1Vb7M9R29pKTgwzVelHzo1xuiep99Um6EbdVo5BxDyGZetCqbbK9n+h24ReY37Xf12wTb/gATmXoh0CH6nr0AUGsf0tqNhUcgiWn0pLsbi59joBD6pTdLU7I4g5101uJns3D1nRYXEb0SiE9NGQSigCD7XND6dt9H6f3hHUS/pvmUj5EsAStts5fk1X7vrJwgbHa9u2k123NqTHgmm24juwDpqzFg6Pjmi4QxlUIs9lzzd38VoaUYASnsia2V5IjoiQUYwQUFBMTAzQ0E1MzdFQUVEODdDMjRERDUzOTA5QjgwQTc4QTkyM0UzODIzRDY4REFDQzk0QjlGRjgzMDVEQyJ9YzsOUEofXLehYJ+JmXQM+svG3UOL5Kz3noidIke0rKN5GKe9uKrishkLFONBjAOyE17cY9L/RtOi6Iu1R8xQVz2GjK8CVmwArLMBJInXJGXLNeDMRaGSTciTOVaK7/4uOBYfZTYv5b23o+rMB7jFFYI93TmipNMB8JFHF9/Qy8jt7E2mmUtZsJynSVcy0uL+K0ZsSp8EDvvDECo60nqggEvFqjIxb9w1U08IGBNrKaXgodXnuvb5YD8/MLCehmhnU9VMLbtL5xMZBdkmDli1ESuHhUa1xcgsYV5Ok0Z3o8xG3HGa2FbE1gxDMS4b0NuWEbFPAJw6eDQwdSoizgufO+z+yVbZP3Ei42Bgx9//BbYeKgYGpDM+QZYsjJhOWZyBtl2kNFGzrS+8K0gQQKXQmcvDA58tS5/4kMSuMIIAsA/mSwJYXOta0VpKOFcuo4Wv5Ua91gONA4ERo/LCZszOC1PXPxxJVD8WCzqFxzlYy4zPhFrf5Zfk4xUJ/4z878+/6ekzVASST/iUM4uyCvNkHcUFWPPj9lNDQF9DMX3GVzWuRl9k6JmuFc/B6Phun1KUzTjvaUxX1l9hY4MUToZKriTVC3ih4vpFD/XzJIrgBbs8bj6/2+kcC4c=\" }"
    }
  }
}
```

</details>

#### Automatic top-ups

Offer contracts that occur on a non-fixed schedule using stored card details, for example, automatic top-ups when the cardholder's balance drops below a certain amount.

To save payment details for automatic top-ups payments, [add following fields to your `createSessionRequest`](./WebComponentsIntegrationGuide.md#step-5-make-a-payment):

- `shopperReference: 'YOUR_SHOPPER_REFERENCE'` - `shopperReference` will be later used for managing the stored payment details.
- `shopperInteraction: Ecommerce`
- `recurringProcessingModel: UnscheduledCardOnFile`
- `storePaymentMethod: true`
- `removeSensitiveData: false` - set this if your adyen-integration is deployed with `removeSensitiveData: true` configuration. The reason is by default stored payment details are returned asynchronously in `additionalData` in notification and this field is being removed when `removeSensitiveData: true`.

<details>
<summary>Click to expand an example `createSessionRequest`</summary>

```json
{
  "amount": {
    "currency": "EUR",
    "value": 1000
  },
  "reference": "YOUR_REFERENCE",
  "channel": "Web",
  "returnUrl": "https://your-company.com/...",
  "merchantAccount": "YOUR_MERCHANT_ACCOUNT",
  "storePaymentMethod": true,
  "shopperReference": "YOUR_SHOPPER_REFERENCE",
  "shopperInteraction": "Ecommerce",
  "recurringProcessingModel": "UnscheduledCardOnFile",
  "removeSensitiveData": false
}
```

</details>

<details>
<summary>The commercetools payment representation example with `createSessionRequest` and `createSessionResponse` with stored payment. Click to expand.</summary>

```json
{
  "key": "YOUR_PAYMENT_KEY",
  "amountPlanned": {
    "type": "centPrecision",
    "currencyCode": "EUR",
    "centAmount": 1000,
    "fractionDigits": 2
  },
  "paymentMethodInfo": {
    "paymentInterface": "ctp-adyen-integration"
  },
  "custom": {
    "type": {
      "typeId": "type",
      "id": "3540c278-dfe9-45a2-94cd-651025019bb2"
    },
    "fields": {
      "createSessionRequest": "{ \"amount\": { \"currency\": \"EUR\", \"value\": 1000 }, \"reference\": \"YOUR_REFERENCE\", \"channel\": \"Web\", \"returnUrl\": \"https://your-company.com/...\", \"merchantAccount\": \"YOUR_MERCHANT_ACCOUNT\", \"storePaymentMethod\": true, \"shopperReference\": \"YOUR_SHOPPER_REFERENCE\", \"shopperInteraction\": \"Ecommerce\", \"recurringProcessingModel\": \"UnscheduledCardOnFile\", \"removeSensitiveData\": false }",
      "adyenMerchantAccount": "YOUR_MERCHANT_ACCOUNT",
      "commercetoolsProjectKey": "YOUR_COMMERCETOOLS_PROJECT_KEY",
      "createSessionResponse": "{ \"amount\": { \"currency\": \"EUR\", \"value\": 1000 }, \"channel\": \"Web\", \"expiresAt\": \"2023-02-16T16:02:18+01:00\", \"id\": \"CS9D33B3D890E2F172\", \"merchantAccount\": \"YOUR_MERCHANT_ACCOUNT\", \"recurringProcessingModel\": \"UnscheduledCardOnFile\", \"reference\": \"YOUR_REFERENCE\", \"returnUrl\": \"https://your-company.com/...\", \"shopperInteraction\": \"Ecommerce\", \"shopperReference\": \"YOUR_SHOPPER_REFERENCE\", \"storePaymentMethod\": true, \"mode\": \"embedded\", \"sessionData\": \"Ab02b4c0!BQABAgB0RjHe+VsvhLFHjkUQg4AAgbz3XIntI+/2XDqmiLc9amxHaYObeaqL876hzdhki4WSLASw33vFIqBEkFgBQHVmHKKlK2fEkirUFtK6o9FUKNHB8hdSBqSnpOOnQ+oH15ZkDwqmEUDC84iM2/voMgDDEXvEufhROtZgPB/ADgYE1tp7iMCARe6jW5NgJGPtUwYVJMk7B77qV5L5/9N/nhNpxIXbR1wkm+54DMOmzuonSP6VCrEIzC3GlG7ogqpasNWqluTjCwyFntYaJid6HqR/wbMwqm2Ifk4U8pAg/iV5pFLInYu3DU92u2MU/oYx5ZCNZcs01XJ7LpgZbr1FRFQUBeEgtonH6f2bZpZwLoJtRELDD6myyUBiSFzpDkaQKz+864lH72z4sZOQCxnhMZKBoVCvjsvbFnwnCDWn7GCS1sMk7lVnTJzJOFsmJSSscAPVBI2PxjGpjgDWtv8Cp/GTngZU+Gwdqs+GwafIb7cVxxjTrLf7Kmp6AHS5ndILG3pgE2a2IUejOHUbTMwksaGso5UHNFyj9DNf8D4XjsZfVeVL1Vlp7UU+cOpezL50o0PPOswomTT4/DsQ/n82BKysGAxnYhKtDaM3Jd4Bmb+96oSpT+Cm87wcbFiH4LaB9QPpKl3DypI2oHB3MVU64qeorM8HS6SbnYtHA+otXCkUPQx8QOO4U8qiTy3QCMkASnsia2V5IjoiQUYwQUFBMTAzQ0E1MzdFQUVEODdDMjRERDUzOTA5QjgwQTc4QTkyM0UzODIzRDY4REFDQzk0QjlGRjgzMDVEQyJ9A1UjIJt4nRZheX40+bPDpZk60wXWDltXi44TWLsSFOMdQZR1zb87mr73c8q5cDy5O02zbaim+7aA+tC4Lri3YFYjH2YhFM2vdye7koFyK0NoRBlOoepxszZN8ulJzIqR+9feBDssNCt6s0Mm8m5hKbL6zKLoFH4Q8I6SiVdBe4LAIT/znPQ1lQXlfhktNAUU0ILx6pbXv3CInzfgFWfT/rvzZrWtrb64xD6W2wsh47agMoDzU5LmnxNs300ETtsj2teRe9aVeuby22B5afi1hNoAl7RJfriyuiTVm+H9sjKqowkiJFtlkgTctbgpxp0lD7M7wZSDm1cVSmSFst0H9FuusHfEFslDTbeP3GtR//LvgKPraCTbzXDQ4Gb6AAlThu1fV9pt3AKRSKL13W2ty2SNlVDuLbIzbgQfSG4DPkqVYu9B/sOqr4hSCyNwtcsUmbbn+ZcqKYDtwlKdjS16biCJkFM6IGbJ5PtGGt0PMoQ9kimyJDIi5iETMUV7LokQcadGDhtD5vbklB7dqrbIviU3Z/0aiwLgF1P5IjcCrqrPkau3bXjkemXPXCgKFN74a2AckQQHEGWEpdYQNM6DR10XG0shIC/ZpawGhRBjbGv19Km3kYXG4e9ROML91g7eAis=\" }"
    }
  }
}
```

</details>

### Delete stored payments

To delete stored payment details, see [Disable stored payments documentation](./DisableStoredPayments.md).

### Resources

https://docs.adyen.com/online-payments/tokenization/create-and-use-tokens
