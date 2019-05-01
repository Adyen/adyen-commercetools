**Please see [Integration Guide](IntegrationGuide.md) first before continuing with this document.**

## Cancel or refund a payment

1. Shop updates a payment with [a new transaction](https://docs.commercetools.com/http-api-projects-payments#add-transaction)
    1. for refund
        ```
        {
          "version": ${currentVersion},
          "actions": [
            {
              "action": "addTransaction",
              "transaction": {
                "type": "Refund",
                "amount": {
                  "currencyCode": "${currencyCode}",
                  "centAmount": ${centAmount}
                },
                "state": "Initial"
              }
            }
          ]
        }
        ```
    1. for cancel authorization
        ```
        {
          "version": ${currentVersion},
          "actions": [
            {
              "action": "addTransaction",
              "transaction": {
                "type": "CancelAuthorization",
                "amount": {
                  "currencyCode": "${currencyCode}",
                  "centAmount": ${centAmount}
                },
                "state": "Initial"
              }
            }
          ]
        }
        ```
    Both transaction types works the same, because Adyen will always pick the right action for the current transaction.
    If the transaction is not authorized yet, Adyen will try to cancel.
    If the transaction is already charged, Adyen will do refund.
1. Extension module finds the first `Payment.transactions` with a transaction `type='Charge' and state='Success'`. 
Extension module takes `amount` and `transactionId` from this transaction and makes a Cancel or refund request.  
1. Extension module saves following information to the payment object:
    * `Payment.interfaceInteractions.type='cancelOrRefund'` contains request and response with Adyen
    * `Payment.transactions` with a transaction `type='Refund' and state='Initial'` will be changed to `state='Pending'`.
    * `Payment.transactions` with a transaction `type='CancelAuthorization' and state='Initial'` will be changed to `state='Pending'`.
1. At this point, Adyen queues the Cancel or refund request for processing.
The result of cancel/refund will be processed asynchronously by the notification module and the payment will be updated accordingly.  

![Cancel or refund flow](https://user-images.githubusercontent.com/803826/56808274-6218f600-6831-11e9-8b6e-0997b9504492.png)

#### More info
For more detailed information from Adyen's perspective, see [Adyen's documentation](https://docs.adyen.com/developers/development-resources/payment-modifications/cancel-or-refund).
