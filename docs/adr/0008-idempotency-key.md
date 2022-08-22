# 8. Idempotency key

Date: 2022-08-17

## Status

[Approved](https://github.com/commercetools/commercetools-adyen-integration/pull/1000)

## Context
Payment modifications actions are using POST requests. POST is not idempotent by definition. Therefore, by default it is not possible to retry when payment modification requests fail if you want to avoid unwanted duplications. For example, when partial capture gets a timeout error from Adyen, it could cause double-processing of the same request when retry as Adyen will consider the retry request as a new partial capture request.

To enable retry on failure for payment modifications, an idempotency key needs to be sent with every request. This idempotency key is sent in the header as `Idempotency-Key:<key>`. It has to be unique per request so that we can retry the request with the same idempotency key.

There are 2 payment modification actions currently supported in Adyen-integration and that could be affected by the idempotency problem: [partial capture](../../extension/docs/ManualCapture.md) and [partial refund](../../extension/docs/Refund.md). Both payment modifications are triggered by adding a payment transaction.   

## Decision
A new String custom field called `idempotencyKey` will be added to the payment transaction custom type `key="ctp-adyen-integration-transaction-payment-type"`. When this field `idempotencyKey` is present in the payment transaction, Adyen-integration will take its value and send it as a value for `Idempotency-Key` header. 

## Source
https://docs.adyen.com/development-resources/api-idempotency
