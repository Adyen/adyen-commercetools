<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Contents**

- [KCP payment](#kcp-payment)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

**Please see [Integration Guide](IntegrationGuide.md) first before continuing with this document.**

## KCP payment
1. Contact Adyen to enable KCP
1. Shop creates a payment with following criteria:
    * `Payment.paymentMethodInfo.method = 'kcp_creditcard' OR payment.paymentMethodInfo.method = 'kcp_banktransfer'`
    * `Payment.transactions` contains a transaction with `type='Authorization' and state='Initial'`
    * `Payment.custom.fields.returnUrl` contains return URL to which the shopper will be redirected after completion.
1. Extension module makes a `Redirect shopper` request and saves following information to the payment object:
    * `Payment.interfaceInteractions` with `type='makePayment'` that contains request and response with Adyen 
    * `payment.custom.fields.redirectUrl`
    * `payment.custom.fields.redirectMethod`
    * `Authorization` transaction state will be updated to `Pending`
1. Shop redirects user to KCP using the custom fields above

**TODO: to be continued**
