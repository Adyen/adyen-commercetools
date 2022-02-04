# 5. Adding line items

Date: 2022-02-01

## Status

[Approved](https://github.com/commercetools/commercetools-adyen-integration/pull/918)

## Context

- Many payment methods requires information about the price and product information by specifying `lineItems` in `makePaymentRequest`.
- Integration can **add lineItems** from commercetools cart for [klarna and affirm payments](https://github.com/commercetools/commercetools-adyen-integration/blob/v9.6.0/extension/docs/WebComponentsIntegrationGuide.md#klarna-payment-and-affirm-payment).
- There are many payment methods which require line items **besides** the klarna and affirm payment.
- Integration adds lineItems for Affirm and Klarna only. Users need to write additional logic to include those lineItems for other payment methods which poses an inconvenience. For instance check the request here on issue [#728](https://github.com/commercetools/commercetools-adyen-integration/issues/728).

## Decision

- If lineItems field is provided with `makePaymentRequest`, extension will skip adding lineItems and leave the provided lineItems.
- An application configuration flag `addCommercetoolsLineItems: true/false` for extension, which will default to **false**. If set to **true**, it would add lineItems to payment methods that requires lineItems.
- If user sets  `"addCommercetoolsLineItems": true` in the `makePaymentRequest`, then integration would generate line items, regardless of the setting in the application config.
    - For backwards compatibility, the integration still adds line items for both Affirm and Klarna. No matter if `addCommercetoolsLineItems` on application config set to true or false.
- Extension will not add lineItems for payment methods where lineItems are not beneficial and thus we save an API call to fetch the cart.

Payment method types that requires [lineItems](https://docs.adyen.com/api-explorer/#/CheckoutService/latest/payments__reqParam_lineItems): 
`afterpay`, `afterpaytouch`, `klarna`, `ratepay`, `facilypay`, `clearpay`, `grabpay`, `paybright`, `pix`, `zip`.

## Consequences

- Better business flow with providing an out of box solution for adding line items for many payment types that requires `lineItems`.
