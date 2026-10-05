# 15. Correct a failed Authorization transaction on a later successful AUTHORISATION notification

Date: 2026-09-29

## Status

Accepted

## Context

The notification module matches an Adyen notification to an existing commercetools transaction by `pspReference`
(see [ADR 11](0011-matching-adyen-notification.md)) and only changes the transaction state when the new state comes
later in the generic flow `Initial` → `Pending` → `Success` → `Failure`. This protects, for example, a successful
`Charge` transaction from being overwritten by a replayed or late `CAPTURE` notification and lets
`CAPTURE_FAILED` move a successful `Charge` to `Failure`.

Adyen does not guarantee that a single `AUTHORISATION` notification is final. For redirect payment methods
(observed with PayPal) Adyen first sent `AUTHORISATION` with `success=false` because of a temporary acquirer error
(`INTERNAL_SERVICE_ERROR`) and a few seconds later `AUTHORISATION` with `success=true` and `refusalReasonRaw=COMPLETED`
for the **same** `pspReference`. Both notifications are stored as interface interactions, but the `Authorization`
transaction stayed in `Failure` because `Failure` → `Success` is rejected by the generic ordering. The commercetools
payment then contradicts the final authorization result reported by Adyen.

## Decision

- Keep the generic linear transaction state flow as it is.
- Add one explicit exception: when the notification `eventCode` is `AUTHORISATION`, the matched transaction is of type
  `Authorization` and currently in state `Failure`, and the mapped new state is `Success`, the notification module
  emits `changeTransactionState` (to `Success`) and `changeTransactionTimestamp` for that transaction.
- The exception is scoped to `AUTHORISATION` / `Authorization` only. `Charge`, `Refund` and `CancelAuthorization`
  transactions keep the existing behaviour, because for those Adyen reports a later failure with a dedicated
  `*_FAILED` event and never a success after a failure for the same `pspReference`.

## Consequences

- A payment authorised by Adyen after a transient failure ends up with an `Authorization` transaction in `Success`,
  so order creation based on transaction state changes works for these payments.
- A `changeTransactionState` from `Failure` to `Success` is now possible for `Authorization` transactions. Merchants
  that react to `PaymentTransactionStateChanged` messages should not assume `Failure` is a terminal state for
  `Authorization`.
- Notification delivery order is not guaranteed by Adyen. If the failed `AUTHORISATION` notification is delivered
  after the successful one, the transaction still ends up in `Failure` (unchanged behaviour). This is accepted for now.
