# Frequently asked questions

### Can we use Adyen web components >= v5.0.0 with this integration ?

Yes, you could use the web components > v5.0.0. It's always better to keep your web component front end dependencies up to date with following latest Adyen releases.

In v5.0.0 (released in October 2021) Adyen introduced a simplified way of integrating Web Components, using a single API endpoint. The `/sessions` release is only an orchestration layer on top of existing functionalities.
This means that the complete checkout experience is still available and existing merchants will not have to change anything to their existing workflow. In fact, the 3 step `/paymentMethods`, `/payments`, `/payments/details` is still the way to go for more complex user flows.
Adyen will be revisiting this topic in Q2 2022 and we will keep you updated on the potential upgrade regarding with `/session` endpoint usage with this integration.

### Does the integration support payment method X ?

Integration supports all [Adyen Web Component](https://docs.adyen.com/checkout/components-web) based payment methods. For a full list of payment methods please refer to [supported payment methods](https://docs.adyen.com/checkout/supported-payment-methods).
If you encounter any problems during your integration, feel free to create a github issue.

### Can I pass additional fields to payment requests?

Yes, you could include additional fields to payment such as [add risk management fields](https://docs.adyen.com/risk-management/configure-standard-risk-rules/required-risk-field-reference), [activate 3D Secure 2](https://docs.adyen.com/online-payments/3d-secure/native-3ds2/web-component#make-a-payment) or [allow recurring payments](https://docs.adyen.com/payment-methods/cards/web-component#create-a-token) based on the payment method that you use, for more details please check the note in [important section](../extension/docs/WebComponentsIntegrationGuide.md#step-5-make-a-payment) on our integration docs.

### Can I pass lineItems to makePayment requests ?

Integration supports automatically adding lineItems from commercetools cart for klarna and affirm payments if the payment is referenced in the cart, beside that lineItems and other required data can be provided by the users of the integration within the makePaymentRequest as answered in the above question. If lineItems field is provided, integration will skip adding lineItems and leave the provided lineItems.

### Why we need to pass submit payment details twice for some payment methods?

For some payment methods you need to submitAdditionalPaymentDetails twice based on the returned action from Adyen (such as 3DS v2 with IdentifyShopper and ChallengeShopper), please follow instructions in [here](../extension/docs/WebComponentsIntegrationGuide.md#action-response-1) for more details.

### Can I remove a subscription I created?

If you accidentally created a subscription you can edit it and uncheck the **Active** checkbox so Adyen doesn't send notifications. Then you can contact the Adyen support and ask them to remove the subscription

### How does the notification module find a matching payment?

It first find the payment by `key` where `key=${merchantReference}` and then it finds in this payment the corresponding transaction by `interactionId` where `interactionId=${pspReference}`.

### Will we lose a notification if it was not processed for some reason?

Adyen will queue notifications when the notification service was not reachable or it didn't return a success message and will try to send it later.

