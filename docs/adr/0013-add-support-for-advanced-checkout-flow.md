# 13. Add support fro advanced checkout flow

Date: 2023-09-15

## Status

[Accepted]

## Context

In Adyen web component version 5, new endpoint `/sessions` is introduced. It allows merchant to create payment session
before shopper selects payment methods and drastically simplify the checkout flow.

For details, please refer to [Adyen Documentation](https://docs.adyen.com/online-payments/web-components).

On the other hand, API calls for web component v4 can be used for advanced checkout flow, for details,
please refer to [Adyen Documentation](https://docs.adyen.com/online-payments/build-your-integration/additional-use-cases/advanced-flow-integration/?platform=Web&integration=Components&version=5.39.1).

## Decision

- We add all required API payment calls to be able to support advanced checkout flow.    

## Consequences
- The commercetools extension can be utilized for advanced checkout flow implementation.
- The migration to the Checkout web components V5 should be easier since advanced flow support keeps backward compatibility.
