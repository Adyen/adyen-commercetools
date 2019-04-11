**Please see [Integration Guide](IntegrationGuide.md) first before continuing with this document.**

## Paypal payment
1. [Enable Paypal in Adyen](https://docs.adyen.com/developers/payment-methods/paypal#prerequisites)
1. Backend creates a payment with following criteria:
    * `Payment.paymentMethodInfo.method = 'paypal'`
    * `Payment.transactions` contains a transaction with `type='Charge' and state='Initial'`
    * `Payment.custom.fields.returnUrl` contains return URL to which the shopper will be redirected after completion.
1. Extension module make a payment request and save following information to the payment object:
    * `Payment.interfaceInteractions` contains request and response with Adyen
    * `Payment.transactions` with a transaction `type='Charge' and state='Initial'` will be changed to `'Pending'`.
    * `Payment.custom.fields.redirectUrl`  
    * `Payment.custom.fields.redirectMethod`
1. Shop [redirects shopper](https://docs.adyen.com/developers/payment-methods/paypal#step2redirectshopper) to Paypal.
1. After shopper finishes the payment, she got redirected back to the shop. Backend gets from the query string a parameter `details.payload` and saves the parameter into the Payment custom field `Payment.custom.fields.payload`
1. Extension module make a [payment request](https://docs.adyen.com/developers/payment-methods/paypal#step4presentpaymentresult) and save following information to the payment object:
    * `Payment.interfaceInteractions` contains request and response with Adyen 
    * `Payment.transactions` with a transaction `type='Charge' and state='Pending'` will be changed to a new state according to [the returned result code](IntegrationGuide.md#mapping-from-adyen-result-codes-to-ctp-transaction-state).
    * `pspReference` will be saved in a matching transaction from the previous point in a field `transactionInteractionId`
1. Shop presents the results to the shopper.
     
*Notice*: the last step of Extension module is mandatory but it doesn't play any significant role for Adyen.
Funds has already been reserved/transferred after the shopper confirms payment on Paypal. Nevertheless, it's important
to follow all the steps as it's the only way to get `pspReference` from Adyen.  

![Paypal flow](https://user-images.githubusercontent.com/803826/55894234-0d7f4500-5bba-11e9-90d4-e4c03f1c452f.png)