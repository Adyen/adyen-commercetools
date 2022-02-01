# 4. Notification error handling.

Date: 2022-02-01

## Status

[On Review]()

## Context

- Many payment methods requires information about the price and product information by specifying `lineItems` in `makePaymentRequest`.
- Integration supports automatically **adding lineItems** from commercetools cart for [klarna and affirm payments](https://github.com/commercetools/commercetools-adyen-integration/blob/v9.6.0/extension/docs/WebComponentsIntegrationGuide.md#klarna-payment-and-affirm-payment).
- There are many payment methods which require line items **beside** the klarna and affirm payment.
- Since we add out of the box for Affirm and Klarna only the users need to write additional logic to include those items for other payment methods which poses an inconvenience. For instance check the request here on issue [#728](https://github.com/commercetools/commercetools-adyen-integration/issues/728).

## Decision
- If lineItems field is provided with `makePaymentRequest`, extension will skip adding lineItems and leave the provided lineItems.
- An application configuration flag `addCommercetoolsLineItems: true/false` for extension, which will default to false and if set to true would add lineItems to all payment methods.
- If user includes in the makePaymentRequest,  "addCommercetoolsLineItems": true then integration would generate line items, no matter if it's set to false on application config.
- For backwards compatibility, still add line items for both Affirm and Klarna. No matter if "addCommercetoolsLineItems" is set to true or false.
- Extension does not include lineItems for payment methods where those infos are not beneficial and thus we save an API call i.e: fetch the cart.

## Consequences

- Better business flow with providing an out of box solution for adding line items for many payment types that requires `lineItems`.
