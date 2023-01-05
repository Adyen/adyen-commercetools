# 2. Matching Adyen Notification with commercetools payment.

Date: 2020-12-18

## Status

[Deprecated](https://github.com/commercetools/commercetools-adyen-integration/pull/395)

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

Please refer to the [0011-matching-adyen-notification](./0011-matching-adyen-notification.md) for the latest change regarding matching Notification with payment.