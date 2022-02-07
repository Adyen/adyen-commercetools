# 5. Adding line items

Date: 2022-02-01

## Status

[Approved](https://github.com/commercetools/commercetools-adyen-integration/pull/918)

## Context

- Many payment methods require product and cart details which can be provided as `lineItems` within the `makePaymentRequest`.
- Integration can generate **lineItems** from commercetools cart for [klarna and affirm payments](https://github.com/commercetools/commercetools-adyen-integration/blob/v9.6.0/extension/docs/WebComponentsIntegrationGuide.md#klarna-payment-and-affirm-payment) automatically.
- Besides Klarna and Affirm there are many other payment methods which either require or benefit when lineItems are provided.
- Integration adds lineItems for Affirm and Klarna only. Users need to write additional logic to include those lineItems for other payment methods which poses an inconvenience. [Example issue](https://github.com/commercetools/commercetools-adyen-integration/issues/728).

## Decision

- If lineItems field is defined within the `makePaymentRequest`, extension will skip lineItems generation and leave the provided lineItems.
-  If extension application configuration flag named `addCommercetoolsLineItems` is set to `true` then the integration will add lineItems to all payment methods which require lineItems.
- If user sets `"addCommercetoolsLineItems": true` in the `makePaymentRequest`, then the integration will generate lineItems, regardless of the setting in the application config.
    - For backwards compatibility, the integration still adds line items for both Affirm and Klarna - no matter how `addCommercetoolsLineItems` configurations are set.
- Extension will not add lineItems for payment methods where lineItems are not beneficial and thus we save an API call to fetch the cart.

Payment method types that requires [lineItems](https://docs.adyen.com/api-explorer/#/CheckoutService/latest/payments__reqParam_lineItems): 
`klarna`, `affirm`, `afterpay`, `afterpaytouch`, `klarna`, `ratepay`, `facilypay`, `clearpay`, `grabpay`, `paybright`, `pix`, `zip`.

## Consequences

- Spares users of the integration the additional efforts of adding lineItems to the required payment methods.
