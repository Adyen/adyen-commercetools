**Please see [Integration Guide](IntegrationGuide.md) first before continuing with this document.**

## Credit card payment

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Contents**

- [Credit card](#credit-card)
- [Credit card with 3D Secure](#credit-card-with-3d-secure)
- [Other](#other)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

**Note**:

The following features are not supported:
* Recurring card payments
* Manual capture

### Credit card
1. Shop collects shopper details according to the [Adyen documentation](https://docs.adyen.com/developers/payment-methods/cards-with-3d-secure#step1collectshopperdetails) and creates a payment with following criteria:
    * `Payment.paymentMethodInfo.method = 'creditCard'`
    * `Payment.transactions` contains a transaction with `type='Charge' and state='Initial'`
    * `Payment.custom.fields.encryptedCardNumber` contains credit card number encrypted in the previous step.
    * `Payment.custom.fields.encryptedExpiryMonth` contains expiry month encrypted in the previous step.
    * `Payment.custom.fields.encryptedExpiryYear` contains expiry year encrypted in the previous step.
    * `Payment.custom.fields.encryptedSecurityCode` contains security code encrypted in the previous step.
    * `Payment.custom.fields.returnUrl` contains URL to which the shopper will be redirected when shopper completes or abandons the payment process.
    * *Optional*: `paymentObject.custom.fields.holderName`
1. Extension module makes a payment request and save following information to the payment object:
    * `Payment.interfaceInteractions.type='makePayment'` contains request and response with Adyen 
    * `Payment.transactions` with a transaction `type='Charge' and state='Initial'` will be changed to a new state according to [the returned result code](./IntegrationGuide.md#mapping-from-adyen-result-codes-to-ctp-transaction-state).
    * `pspReference` will be saved in a matching transaction from the previous point in a field `Payment.transactions.interactionId`
1. Shop validates the payment and presents the payment result to the shopper.

![Credit card flow](https://user-images.githubusercontent.com/803826/55894199-fb050b80-5bb9-11e9-88e9-7efbe62c55bb.png)

### Credit card with 3D Secure
1. Shop collects shopper details according to the [Adyen documentation](https://docs.adyen.com/developers/payment-methods/cards-with-3d-secure#step1collectshopperdetails) and creates a payment with following criteria:
    * `Payment.paymentMethodInfo.method = 'creditCard_3d'`
    * `Payment.transactions` contains a transaction with `type='Charge' and state='Initial'`
    * `Payment.custom.fields.encryptedCardNumber` contains credit card number encrypted in the previous step.
    * `Payment.custom.fields.encryptedExpiryMonth` contains expiry month encrypted in the previous step.
    * `Payment.custom.fields.encryptedExpiryYear` contains expiry year encrypted in the previous step.
    * `Payment.custom.fields.encryptedSecurityCode` contains security code encrypted in the previous step.
    * `Payment.custom.fields.returnUrl` contains return URL to which the shopper will be redirected after completion.
    * `Payment.custom.fields.browserInfo` contains **JSON stringfied** browser info. See [Adyen documentation](https://docs.adyen.com/developers/payment-methods/cards-with-3d-secure#step2makeapayment) for more information. 
    * *Optional*: `paymentObject.custom.fields.holderName`
1. Extension module makes a payment request and save following information to the payment object (for explanation of each field, see [Adyen's documentations](https://docs.adyen.com/developers/payment-methods/cards-with-3d-secure#step2makeapayment)):
    * `Payment.interfaceInteractions.type='makePayment'` contains request and response with Adyen
    * `Payment.transactions` with a transaction `type='Charge' and state='Initial'` will be changed to `state='Pending'`.
    * `Payment.custom.fields.MD`
    * `Payment.custom.fields.PaReq`  
    * `Payment.custom.fields.paymentData`  
    * `Payment.custom.fields.redirectUrl`  
    * `Payment.custom.fields.redirectMethod`
1. Shop [redirects shopper](https://docs.adyen.com/developers/payment-methods/cards-with-3d-secure#step3redirectshopper) to verify credit card payment.
1. After shopper verifies, shopper got redirected back to the shop. Shop gets from the form data a parameter `PaRes` and saves the parameter into the Payment custom field `Payment.custom.fields.PaRes`
1. Extension module makes a [payment request](https://docs.adyen.com/developers/payment-methods/cards-with-3d-secure#step4completepayment) and save following information to the payment object:
    * `Payment.interfaceInteractions.type='completePayment'` contains request and response with Adyen 
    * `Payment.transactions` with a transaction `type='Charge' and state='Pending'` will be changed to a new state according to [the returned result code](IntegrationGuide.md#mapping-from-adyen-result-codes-to-ctp-transaction-state).
    * `pspReference` will be saved in a matching transaction from the previous point in a field `Payment.transactions.interactionId`
1. Shop validates the payment and presents the payment result to the shopper.

**Important:** Adyen will send request to the issuing bank and the bank will authorize the payment or hold money ONLY after [Complete payment step](https://docs.adyen.com/developers/payment-methods/cards-with-3d-secure#step4completepayment) is done. In this documentation, it means all steps above have to be done successfully. 

![3D Secure flow](https://user-images.githubusercontent.com/803826/55894047-b0838f00-5bb9-11e9-9377-c7db2a0c40f7.png)

### Other
Please consult [Adyen documentation](https://docs.adyen.com/developers/payment-methods/cards) for additional information.