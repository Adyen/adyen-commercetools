# Integration Guide

The following diagram shows whole checkout flow supported with [Adyen Web Components](https://docs.adyen.com/checkout/components-web).

![Flow](https://user-images.githubusercontent.com/3469524/85017686-3317bf00-b16c-11ea-8840-f34b97ac3dcb.jpeg)

In your backend, ensure the steps below are done:
1. On each checkout step [validate cart state](#validate-cart-state)
1. Before starting payment process make sure there is no valid payments already:
    * [Recalculate cart](#recalculate-cart)
    * [Validate payment](#validate-payment)
    * [Validate payment transaction](#validate-payment-transaction)

If all above validations are passed then order can be created right away and order confirmation page shown.
Otherwise, shopper might continue with further payment steps.

- [Step 1: Get available payment methods](./Step1-getPaymentMethods.md)
- [Step 2: Add Components to your payments form](./Step2-getOriginKeys.md)

> Note: First 2 steps are optional if originKey and payment methods has been already cached by the merchant server.
 
