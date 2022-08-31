# 10. Generate idempotency key

Date: 2022-08-31

## Status

[Approved]

## Context

[To retry for refund and capture, it is required to have idempotency key in the request header](./0008-idempotency-key.md). In the current setup users has to take care of generating and adding the idempotency key to the requests. This presents an additional work for the users as they need to take care of the implementation.

Adyen-integration will take care of generating the idempotency key and passing it to the refund and capture requests. This process will happen in the background. As a result, it would be possible for users to retry refund and capture requests without any knowledge of the idempotency key.

An idempotency key requires following properties:
- unique
- reproduciable - the same idempotency key needs to be recreatable for the same transaction. 


## Decision

For the above reasons, we picked `transaction.id` as the idempotency key.
