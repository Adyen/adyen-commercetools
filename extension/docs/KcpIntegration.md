**Please see [Integration Guide](IntegrationGuide.md) first before continuing with this document.**

## KCP payment
1. Contact Adyen to enable KCP
1. Shop creates a payment with following criteria:
    * `Payment.paymentMethodInfo.method = 'kcp_creditcard' OR payment.paymentMethodInfo.method = 'kcp_banktransfer'`
    * `Payment.transactions` contains a transaction with `type='Charge' and state='Initial'`
    * `Payment.custom.fields.returnUrl` contains return URL to which the shopper will be redirected after completion.
1. Extension module makes a `Redirect shopper` request and saves following information to the payment object:
    * `Payment.interfaceInteractions.type='makePayment'` contains request and response with Adyen 
    * `payment.custom.fields.redirectUrl`
    * `payment.custom.fields.redirectMethod`
    * `Charge` transaction state will be updated to `Pending`
1. Shop redirects user to KCP using the custom fields above

**TODO: to be continued**
