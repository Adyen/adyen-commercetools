# 6. Pre-authorisation and authorisation adjustment

Date: 2022-06-03

## Status

Approved

## Context

Adyen integration allows front-end to create a (pre)authorisation of the payment in the `makePaymentRequest`. During (pre)authorisation, it is possible to update the payment amount or extend the (pre)authorisation period. When front-end is ready to charge the customer, it makes manual capture request. This is also implemented in Adyen integration.

## Decision
- Add new payment handler for `amountUpdates` endpoint in Adyen. Using the `amountUpdatesRequest` custom field in the payment the extension module will update the (pre)authorized amount and save the response to `amountUpdatesResponse`

## Consequences
