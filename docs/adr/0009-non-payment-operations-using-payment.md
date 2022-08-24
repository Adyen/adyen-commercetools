# 9. Using payments for non-payment operations

Date: 2022-08-22

## Status

[Approved](https://github.com/commercetools/commercetools-adyen-integration/pull/1004)

## Context

There are use cases that are not payment related. For this use case we are considering [managing tokens for recurring payments](https://docs.adyen.com/online-payments/tokenization/managing-tokens). It is not bound to any payments, but rather bound to a particular customer.

## Considered Options
- Use customer endpoint to interact with Adyen for non-payment operations 
- Use payment endpoint to interact with Adyen for non-payment operations

## Decision Outcome
Chose option: payment, because
- adyen-integration already uses payments and has code base ready.
- The flow would be similar to other payment methods that are already in place.
- It is extendable for further backoffice actions in the future in case they are not related to customers anymore.

## Pros and Cons of the Options
### Customer endpoint
- Good, because payment tokens are bound to customers, not to payments.
- Bad, because adyen-integration do not currently use customers endpoint.
- Bad, because it is not clear how error cases should be handled. How would the user see the requests and response from Adyen?
- Bad, because these operations would always need a customer. Anonymous operations would not be possible.
- Bad, because we cannot distinguish if the adyen-integration has been called because of the customer-related changes OR because of our non-payment operations.


### Payment endpoint
- Good, because adyen-integration already use payments and have code base ready.
- Good, because the flow would be similar to other payment methods that are already in place.
- Good, because it is extendable for further backoffice actions in the future in case they are not related to customers anymore.
- Good, because it does not need a customer resource. This is useful for a case when customer is anonymous or customer is not managed by commercetools. 
- Bad, because there will be payments with amount 0 that are not really payments, but rather payment management operations.
- Bad, because there is no direct connection between payments and the customer. In case of recurring payments, user has to define the reference between the customer and the recurring payment.
