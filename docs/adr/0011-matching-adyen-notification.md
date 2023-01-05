# 11. Matching Adyen Notification with commercetools payment.

Date: 2023-01-03

## Status

[Accepted](https://github.com/commercetools/commercetools-adyen-integration/pull/1049)

## Context

The Adyen notification needs to be matched by its commercetools payment equivalent.
We are using the payment key for the merchantReference and fetching the commercetools payment object with query `key="${merchantReference}"`.
Since we have introduced custom reference for refund 
in [v9.10.0](https://github.com/commercetools/commercetools-adyen-integration/releases/tag/v9.10.0), payment is no long able to be obtained by merchant reference as key. 

The alternative for that is the native payment `key` field.

## Decision

- We will use either `pspReference` or `merchantReference` as payment key for matching payment for notification.
- For web component version 5, `pspReference` is first provided in notification with AUTHORIZATION event. It is different from web component version 4, in which `pspReference` has already been provided from Adyen API response in extension module, and used to update as payment key. Therefore we still need `merchantReference` for payment lookup in this scenario.
- For events other than AUTHORIZATION, such as REFUND, CAPTURE, CANCEL, we use `originalReference` from notification
- The notification will use the native payment key to fetch payment. It first finds the payment by `key` where `key in (${merchantReference}, ${pspReference})`.
(If `originalReference` exists, find the payment by `key` where `key in (${merchantReference}, ${originalReference})`), and then it finds in this payment the corresponding transaction by `interactionId` where `interactionId=${pspReference}`. 

## Consequences

- It is possible to lookup payment for different transaction throughout the whole payment process
- The payment key with `pspReference` (or `originalReference) is also unique for all payments.
