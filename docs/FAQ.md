# Frequently asked questions

Find information on most frequently asked questions during integrating on **commercetools-adyen-integration**.

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->


- [Can I use Adyen web components >= v5.0.0 with this integration ?](#can-i-use-adyen-web-components--v500-with-this-integration-)
- [Does the integration support payment method X ?](#does-the-integration-support-payment-method-x-)
- [Can I pass additional fields to payment requests?](#can-i-pass-additional-fields-to-payment-requests)
- [Do we need to pass additional fields to payment requests for 3D Secure 2 payment method?](#do-we-need-to-pass-additional-fields-to-payment-requests-for-3d-secure-2-payment-method)
- [Can I remove a subscription I created?](#can-i-remove-a-subscription-i-created)
- [How does the notification module find a matching payment?](#how-does-the-notification-module-find-a-matching-payment)
- [Will we lose a notification if it was not processed for some reason?](#will-we-lose-a-notification-if-it-was-not-processed-for-some-reason)
- [Does the integration modify order/cart ?](#does-the-integration-modify-ordercart-)
- [What are the best practices for deploying commercetools-adyen-integration ?](#what-are-the-best-practices-for-deploying-commercetools-adyen-integration-)
- [Are there any recommendations for securing the integration services as those need to be publicly exposed?](#are-there-any-recommendations-for-securing-the-integration-services-as-those-need-to-be-publicly-exposed)
- [What are the best practices in regards to commercetools payment object lifecycle?](#what-are-the-best-practices-in-regards-to-commercetools-payment-object-lifecycle)
- [Why payment status is not set?](#why-payment-status-is-not-set)
- [What do I do in case of errors?](#what-do-i-do-in-case-of-errors)
- [When I should create commercetools order ?](#when-i-should-create-commercetools-order-)
  - [What to consider when creating an order _AFTER_ a successful commercetools payment ?](#what-to-consider-when-creating-an-order-_after_-a-successful-commercetools-payment-)
  - [What to consider when creating an order _BEFORE_ a successful commercetools payment ?](#what-to-consider-when-creating-an-order-_before_-a-successful-commercetools-payment-)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

### Can I use Adyen web components >= v5.0.0 with this integration ?

In v5.0.0 (released in October 2021) Adyen introduced a simplified way of integrating Web Components, using a single API endpoint `/sessions`. It is considered as a simplification of existing functionalities.
The migration of this integration has been completed in February 2023. For new merchants, now you can use Adyen web components v5.0.0 with this integration to complete the checkout process.
Since the newly-introduced endpoint `/sessions` aims at replacing the endpoints `/payments` and `/payments/details`. Our integration supports the requests to these two existing endpoints for advanced user flows.
This means that the complete checkout experience is still available and existing merchants will not have to change anything to their existing workflow.

### Does the integration support payment method X ?

Integration supports all [Adyen Web Component](https://docs.adyen.com/checkout/components-web) based payment methods. For a full list of payment methods please refer to [supported payment methods](https://docs.adyen.com/checkout/supported-payment-methods).
If you encounter any problems during your integration, feel free to create a github issue.

### Can I pass additional fields to payment session request?

Yes, you could include additional fields to payment session request such as [add risk management fields](https://docs.adyen.com/risk-management/configure-standard-risk-rules/required-risk-field-reference) or [allow recurring payments](https://docs.adyen.com/payment-methods/cards/web-component#create-a-token) based on the payment method that you use, for more details please check the note in [important section](../extension/docs/WebComponentsIntegrationGuide.md#step-5-make-a-payment) on our integration docs.

### Do we need to pass additional fields to payment requests for 3D secure 2 payment method?

According to the Adyen documentation, it is not required after web component version 5. Since we are now using /session` endpoint which does not require additional configuration for 3D secure.
[adyen documentation](https://docs.adyen.com/online-payments/3d-secure/native-3ds2/web-component)

### Can I remove a subscription I created?

If you accidentally created a subscription you can edit it and uncheck the **Active** checkbox so Adyen doesn't send notifications. Then you can contact the Adyen support and ask them to remove the subscription

### How does the notification module find a matching payment?

It first find the payment by `key` where `key in (${merchantReference}, ${pspReference})`. If original reference exists in notification, the payment can be found by `key` where `key in (${merchantReference}, ${originalReference})`. And then it finds in this payment the corresponding transaction by `interactionId` where `interactionId=${pspReference}`.

### Will we lose a notification if it was not processed for some reason?

Adyen will queue notifications when the notification service was not reachable or it didn't return a success message and will try to send it later.

### Does the integration modify order/cart ?

Order/cart modifications should be part of the front end/merchant server business logic. commercetools-adyen-integration will neither change the cart nor the order.

### What are the best practices for deploying commercetools-adyen-integration ?

- There are multiple ways to deploy the integration. [Here](../deployment-examples) we provided some deployment examples.
- Both modules should be deployed as a publicly exposed services.
- Modules are **stateless** which makes running multiple instances in parallel possible.
- If the modules are deployed into a Kubernetes cluster, it is recommended to **enable horizontal scaling** with at least 2 running instances behind the load balancer in order to omit a downtime.

### Are there any recommendations for securing the integration services as those need to be publicly exposed?

- For production setups we strongly recommend to use HTTPS instead of HTTP.
- To protect your public extension service from unauthorised calls, we recommend to [activate basic auth authentication](../extension/docs/HowToRun.md#commercetools) on the API extension.
- To protect your notification service from unauthorised calls, we strongly recommend that you activate Hash-based message authentication code [HMAC signatures](../notification/docs/IntegrationGuide.md#step-1-set-up-notification-webhook-and-generate-hmac-signature) during the Adyen notification setup.

### What are the best practices in regards to commercetools payment object lifecycle?

- Create commercetools payment as described [here](../extension/docs/WebComponentsIntegrationGuide.md#step-2-creating-a-commercetools-payment).
- After successful payment creation always [add](https://docs.commercetools.com/api/projects/carts#add-payment) it to the appropriate cart.
- **Never delete or un-assign from cart** the payment objects created during the checkout. Clean-up (if required) can be done asynchronously i.e.: after order creation.

### Why payment status is not set?

Currently [payment status](https://docs.commercetools.com/api/projects/payments#paymentstatus) is not maintained by the integration as status of the payment can be derived from the state of the payment transaction(s).

### What do I do in case of errors?

In case you encounter errors during the integration please refer to the [error-handling section](../extension/docs/WebComponentsIntegrationGuide.md#error-handling)

### When I should create commercetools order ?

There are 2 approaches for creating commercetools order. You can create an order either before or after a successful payment.
Both approaches have their good and bad sides, but we found out that creating an order AFTER a successful payment is less harmful. Please read the details below for both approaches and decide based on your checkout scenarios.

#### What to consider when creating an order _AFTER_ a successful commercetools payment ?

- **Shop (success redirect URL) is not reachable due to the network issues**: Since shop creates an order and success shop redirect URL can not be reached we might end up with a successful payment but no order.
  - **Possible solution**: Create an order asynchronously based on the payment transaction changes, which delivery is guaranteed due to the asynchronous notifications from Adyen. Depending on your preference you might either query for the latest messages of type [PaymentTransactionAdded](https://docs.commercetools.com/api/message-types#paymenttransactionadded-message), [PaymentTransactionStateChanged](https://docs.commercetools.com/api/message-types#paymenttransactionstatechanged-message) or [subscribe](https://docs.commercetools.com/api/projects/subscriptions#create-a-subscription) to the mentioned message types. Every [message](https://docs.commercetools.com/api/message-types#message) will link its payment through the `resource` field and since every payment is attached to a cart one has all the informations at hand to decide if the cart has to be converted to order or not. Since the job or worker processing the message is not a usual place where the order is created it might be reasonable to pass the cart ID to another service or web shop URL which will verify the cart and create an order out of it. An example implementation which follows the described approach is shown by [commercetools-payment-to-order-processor](https://github.com/commercetools/commercetools-payment-to-order-processor)
- **More than 1 successful payments on the cart/order**: It is possible to have more than 1 valid payments on the cart/order. It could happen for example when customer initiates a payment in two different tabs for the same cart and both payments are of type redirect (like credit card and paypal.
  These two payments can be completed independently in both tabs. Since every payment should be always attached to the cart this would make a cart to link two successful payments.
  - **Possible solution**: [Refund](https://github.com/commercetools/commercetools-adyen-integration/blob/master/extension/docs/Refund.md) one of the successful payments. Similar as in case of `Create an order based on transaction state changes` above one could process the same message types in order to figure out if the cart has to many successful payments and create a refund.
- **The amount of the successful payment is lower than the cart amount**: During the checkout the shopper might navigate with two tabs, one with the cart and the other tab might be already a redirected payment with fixed amount like PayPal. Shopper can add more items to the cart so that the cart value is not equal to the amount that will be paid in the payment provider tab.
  - **Possible solution**: After a successful payment, validate the cart to check if the cart amount matches the paid amount. If not, refund/cancel the payment and ask the shopper to pay again.

#### What to consider when creating an order _BEFORE_ a successful commercetools payment ?

- If the shopper never finishes (according to the stats most shoppers jump out of checkout when they actually have to pay) or cancels a payment the reserved stock with an order will not be released and thus there is a risk that simple automation (or even many users) will run the shop out of stock.
- There will be orders which will never be paid but shown in commercetools Merchant Center dashboard as revenue - which is not true.
- Not paid orders will falsely boost the concept of “best sellers” index of its products.
- Creating an order does not allow you to modify the original cart anymore. What happens if a shopper forgot something and would like to change the cart just after initiation of the payment?
- How to handle vouchers that can be applied only once but the shopper decided not to finish the payment and change the cart instead? It might require a new cart based on the old cart. The creation of a new cart with the same item might be an issue if an item had only stock = 1 and it has been used in not paid order already.
