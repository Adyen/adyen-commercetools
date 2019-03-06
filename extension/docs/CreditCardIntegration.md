## Credit card payment
Adyen documentation: https://docs.adyen.com/developers/payment-methods/cards (notice: Recurring card payments not supported, manual capture is not supported)

### Credit card
1. Frontend collects shopper details according to the [Adyen documentation](https://docs.adyen.com/developers/payment-methods/cards#step1collectshopperdetails)
and sends these information to Backend.
1. Backend creates a payment with following criteria
    * `Payment.paymentMethodInfo.method = 'creditCard'`
    * `Payment.transactions` contains a transaction with `type='Charge' and state='Initial'`
    * `Payment.custom.fields.encryptedCardNumber` contains credit card number encrypted in the previous step.
    * `Payment.custom.fields.encryptedExpiryMonth` contains expiry month encrypted in the previous step.
    * `Payment.custom.fields.encryptedExpiryYear` contains expiry year encrypted in the previous step.
    * `Payment.custom.fields.encryptedSecurityCode` contains security code encrypted in the previous step.
    * `Payment.custom.fields.returnUrl` contains return URL to which the shopper will be redirected after completion.
1. Adyen-integration will make a payment request and save following information to the payment object:
    * request and response with Adyen will be saved in `payment.interfaceInteractions`
    * `payment.transactions` with a transaction `type='Charge' and state='Initial'` will be changed to a new state according to [the returned result code](#mapping-from-adyen-result-codes-to-ctp-transaction-state).
    * `pspReference` will be saved in a matching transaction from the previous point in a field `transactionInteractionId`
1. Frontend presents the results to the shopper.

### Credit card with 3D Secure
1. Frontend collects shopper details according to the [Adyen documentation](https://docs.adyen.com/developers/payment-methods/cards-with-3d-secure#step1collectshopperdetails)
and sends these information to Backend.
1. Backend creates a payment with following criteria
    * `Payment.paymentMethodInfo.method = 'creditCard_3d'`
    * `Payment.transactions` contains a transaction with `type='Charge' and state='Initial'`
    * `Payment.custom.fields.encryptedCardNumber` contains credit card number encrypted in the previous step.
    * `Payment.custom.fields.encryptedExpiryMonth` contains expiry month encrypted in the previous step.
    * `Payment.custom.fields.encryptedExpiryYear` contains expiry year encrypted in the previous step.
    * `Payment.custom.fields.encryptedSecurityCode` contains security code encrypted in the previous step.
    * `Payment.custom.fields.returnUrl` contains return URL to which the shopper will be redirected after completion.
    * `Payment.custom.fields.browserInfo` contains **JSON stringfied** browser info gathered from the previous step.
1. Adyen-integration will make a payment request and save following information to the payment object (for explanation of each field, see [Adyen's documentations](https://docs.adyen.com/developers/payment-methods/cards-with-3d-secure#step2makeapayment)):
    * `Payment.interfaceInteractions` contains request and response with Adyen
    * `Payment.transactions` with a transaction `type='Charge' and state='Initial'` will be changed to `state='Pending'`.
    * `Payment.custom.fields.MD`
    * `Payment.custom.fields.PaReq`  
    * `Payment.custom.fields.paymentData`  
    * `Payment.custom.fields.redirectUrl`  
    * `Payment.custom.fields.redirectMethod`
1. Frontend [redirects shopper](https://docs.adyen.com/developers/payment-methods/cards-with-3d-secure#step3redirectshopper) to verify credit card payment.
1. After shopper verifies, she got redirected back to the shop. Backend gets from the query string a parameter `PaRes` and saves the parameter into the Payment custom field `Payment.custom.fields.PaRes`
1. Adyen-integration will make a [payment request](https://docs.adyen.com/developers/payment-methods/cards-with-3d-secure#step4completepayment) and save following information to the payment object:
    * request and response with Adyen will be saved in `payment.interfaceInteractions`
    * `payment.transactions` with a transaction `type='Charge' and state='Pending'` will be changed to a new state according to [the returned result code](#mapping-from-adyen-result-codes-to-ctp-transaction-state).
    * `pspReference` will be saved in a matching transaction from the previous point in a field `transactionInteractionId`
1. Frontend presents the results to the shopper.

**Important:** Adyen will send request to the issuing bank and the bank will authorize the payment or hold money ONLY after [Complete payment step](https://docs.adyen.com/developers/payment-methods/cards-with-3d-secure#step4completepayment) is done. In this documentation, it means all steps above have to be done successfully. 

### Mapping from Adyen result codes to CTP transaction state
|Adyen result code| CTP transaction state
| --- | --- |
| redirectshopper| Pending|
| received| Pending|
| pending| Pending|
| authorised| Success|
| refused| Failure|
| cancelled| Failure|
| error| Failure|



Q: What happens if there are 2 different transactions in the payment?  
Q: What happens when user cancels the payment?
