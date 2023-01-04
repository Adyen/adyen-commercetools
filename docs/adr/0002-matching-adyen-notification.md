# 2. Matching Adyen Notification with commercetools payment.

Date: 2020-12-18

## Status

[Accepted](https://github.com/commercetools/commercetools-adyen-integration/pull/395)

## Context

The Adyen notification needs to be matched by its commercetools payment equivalent.
We are using the custom field for the merchantReference and fetching the commercetools payment object with query `custom(fields(merchantReference="${merchantReference}"))`.
The alternative for that is the native payment `key` field.

## Decision

- We will use the native payment key for matching payment for notification.
- The extension module will validate the reference field makePaymentRequest#reference before handling the payment to avoid unnecessary calls to Adyen.
- The payment key will be set by the make payment handler, also makePaymentRequest#reference should be validated to avoid mismatches.
- The notification will use the native payment key to fetch payment. It first finds the payment by `key` where `key=${merchantReference}` and then it finds in this payment the corresponding transaction
by `interactionId` where `interactionId=${pspReference}`. 

## Consequences

- It is easier to fetch a key rather than using a custom field, also a key is an indexed field, so with a key, it's more performant.
- The payment key is unique for all payments.
- It's not possible to set key with my-payments endpoint. This prevents by default changing/removing the key accidentally. It is more secure than custom fields as the custom field might be changed with my-payment endpoint. Check for more details: https://docs.commercetools.com/api/projects/me-payments


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

- We will use both `pspReference` and `merchantReference` as payment key for matching payment for notification.
- `merchantReference` is still used for payment lookup because `pspReference` is obtained in notification module instead of extension module in Adyen Web Component version 5.0.
- For events other than AUTHORIZATION, such as REFUND, CAPTURE, CANCEL, we use `originalReference` from notification
- The notification will use the native payment key to fetch payment. It first finds the payment by `key` where `key in (${merchantReference}, ${pspReference})`.
(If `originalReference` exists, find the payment by `key` where `key in (${merchantReference}, ${originalReference})`), and then it finds in this payment the corresponding transaction by `interactionId` where `interactionId=${pspReference}`. 

## Consequences

- It is possible to lookup payment for different transaction throughout the whole payment process
- The payment key with `pspReference` (or `originalReference) is also unique for all payments.
