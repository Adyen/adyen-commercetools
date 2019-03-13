## KCP payment

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Contents**

- [Credit card](#credit-card)
- [Credit card with 3D Secure](#credit-card-with-3d-secure)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

**Please see [Integration Guide](IntegrationGuide.md) first before continuing with this document.**

### KCP
1. Contact Adyen to enable KCP
1. Backend creates a payment with following criteria:
    * `Payment.paymentMethodInfo.method = 'kcp_creditcard' OR payment.paymentMethodInfo.method = 'kcp_banktransfer'`
    * `Payment.transactions` contains a transaction with `type='Charge' and state='Initial'`
    * `Payment.custom.fields.returnUrl` contains return URL to which the shopper will be redirected after completion.
1. Adyen-integration makes a `Redirect shopper` request and saves following information to the payment object:
    * `payment.interfaceInteractions` contains request and response with Adyen 
    * `payment.custom.fields.redirectUrl`
    * `payment.custom.fields.redirectMethod`
    * `Charge` transaction state will be updated to `Pending`
1. Frontend redirects user to KCP using the custom fields above

**TODO: to be continued**
