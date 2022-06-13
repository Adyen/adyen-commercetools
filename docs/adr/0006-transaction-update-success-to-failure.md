# 6. Update transaction success to failure state

Date: 2022-06-06

## Status

[Approved](https://github.com/commercetools/commercetools-adyen-integration/pull/971)

## Context

- It was not possible for a payment transaction to change state from `Success` to `Failure`. We thought that once a transaction is successful, it could not fail again.
- However, in case of `Capture` transaction, the assumption above does not work. This is due to the flow how `Capture` works in Adyen.  
- Capture has a few stages:
  - Capture request coming to Adyen.
  - Capture request coming from Adyen to the bank.
- Capture notification with `success: true` indicates that the capture request is valid (for example, the authorisation has not expired, and the balance is available) and has been submitted to the bank/third-party processor.
- Capture notification with `success: false` indicates that the capture request to Adyen has failed. This could be due to a number of reasons. For example, Insufficient balance on payment.
- **When this first stage has been passed, it is still possible that the bank refuses the call we made, this will then trigger the notorious `Capture_Failed`**. The reason for which you'll find in the reason field of the AdditionalData of the notification. In most cases Adyen can retry the capture which will then lead to a successful captured booking.

## Decision

- It should be allowed to update the transaction state from `Success` to `Failure`.
