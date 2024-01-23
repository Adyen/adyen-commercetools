# 12. Remove obsolete API call for web component v5

Date: 2023-02-24

## Status

[Deprecated](https://github.com/commercetools/commercetools-adyen-integration/pull/1050)

## Context

In Adyen web component version 5, new endpoint `/sessions` is introduced. It allows merchant to create payment session
before shopper selects payment methods and drastically simplify the checkout flow.

For details, please refer to [Adyen Documentation](https://docs.adyen.com/online-payments/web-components).

On the other hand, API calls for web component v4 is still existing in this integration, such as `/payments` for making payment and
`/payment/details` for submitting additional payment details. These API calls are no longer required in Adyen web component v5.

## Decision

- We add handler to send request to `/sessions`. Merchant need to provide `createSessionRequest` custom field in Commercetools payment.
- We remove handlers for making payment and submission of additional payment details. Now we do not support custom fields `makePaymentRequest` and `submitAdditionalPaymentDetailsRequest` anymore. Otherwise, any feature changes and bug fixes in the future have to apply on 
both creating session flow and existing making payment flow, which duplicates the effort to implement changes and make this integration hard to be maintained.    

## Consequences
- If users need bug fixes or enhanced features, they needs to adapt web component v5 which is a breaking change.

