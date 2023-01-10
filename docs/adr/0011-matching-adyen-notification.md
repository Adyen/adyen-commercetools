# 11. Matching Adyen Notification with commercetools payment.

Date: 2023-01-03

## Status

[Accepted](https://github.com/commercetools/commercetools-adyen-integration/pull/1049)

## Context

The Adyen notification needs to be matched by its commercetools payment equivalent.
We are using the payment key for the `merchantReference` and fetching the commercetools payment object with query `key="${merchantReference}"`.
Since [v9.10.0](https://github.com/commercetools/commercetools-adyen-integration/releases/tag/v9.10.0), we have introduced custom reference for refund.
Payment key could be the custom field in payment transaction defined by user, therefore payment is no longer always able to be obtained by merchant reference as key. 

The alternative for that is to use `pspReference` as payment `key` field.

## Decision

- We will use `originalReference` (or `pspReference` if `originalReference` does not exist) or `merchantReference` as payment key for matching payment for notification.
- For web component version 4, `pspReference` can be obtained from `makePaymentResponse` in extension module. It is used to update as payment key. Therefore we can match the payment by `pspReference` given in notification.
- For web component version 5, `pspReference` is first provided in notification with AUTHORIZATION event. It is different from web component version 4, in which `pspReference` has already been provided from Adyen API response in extension module, and used to update as payment key. Therefore we still need `merchantReference` for payment lookup in this scenario.
Once payment is found, update the payment key with `pspReference` obtained in notification.
- For events other than AUTHORIZATION, such as REFUND, CAPTURE, CANCEL, we use `originalReference` from notification, which is the original `pspReference` obtained in AUTHORIZATION notification.
- The notification will use the CTP payment key to fetch payment. It first check if `originalReference` exists. If yes, 
  it finds the payment by `key` where `key in (${merchantReference}, ${originalReference})`), otherwise it finds the payment by `key` where `key in (${merchantReference}, ${pspReference})`.
  After that it finds the corresponding transaction in this payment by `interactionId` where `interactionId=${pspReference}`. 

For details, please refer to the [code snippet](https://github.com/commercetools/commercetools-adyen-integration/blob/dcbc5794cd4c470d1cf5a8c23623214671bf1849/notification/src/handler/notification/notification.handler.js#L52)

## Consequences
- It is possible to lookup payment for different transaction throughout the whole payment process
- The payment key with `pspReference` (or `originalReference`) is also unique for all payments.
