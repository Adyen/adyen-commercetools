<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Table of Contents**  *generated with [DocToc](https://github.com/thlorenz/doctoc)*

- [Order creation best practices](#order-creation-best-practices)
    - [AFTER a successful payment](#after-a-successful-payment)
      - [Limitations & Solutions](#limitations--solutions)
    - [BEFORE a successful payment](#before-a-successful-payment)
      - [Limitations](#limitations)
      - [Conclusion](#conclusion)
- [Payment related best practices](#payment-related-best-practices)
- [Order/Cart related best practices](#ordercart-related-best-practices)
- [Deployment best practices](#deployment-best-practices)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Order creation best practices
#### AFTER a successful payment
##### Limitations & Solutions
- It is possible that shop was not reachable due to network issues. In that case there will be a successful payment but no order.

  ###### Possible solution:
  Create an order based on the payment transaction changes, which delivery is guaranteed due to the asynchronous notifications from Adyen. Depending on your preference you might either query for the latest messages of type [PaymentTransactionAdded](https://docs.commercetools.com/api/message-types#paymenttransactionadded-message), [PaymentTransactionStateChanged](https://docs.commercetools.com/api/message-types#paymenttransactionstatechanged-message) or [subscribe](https://docs.commercetools.com/api/projects/subscriptions#create-a-subscription) to the mentioned message types. Every [message](https://docs.commercetools.com/api/message-types#message) will link its payment through the `resource` field and since every payment is attached to a cart one has all the informations at hand to decide if the cart has to be converted to order or not. Since the job or worker processing the message is not a usual place where the order is created it might be reasonable to pass the cart ID to another service or web shop URL which will verify the cart and create an order out of it.

------  
- It is possible to have more than 1 valid payments on the cart/order. During checkout in two tabs, two redirect payments
(like credit card and paypal) can be created for the same cart. These two payments can be completed independently in both tabs.
 This will lead the cart that links to two successful payments.
  ###### Possible solution:
  Refund the payment. (It can be based on commercetools messages or subscriptions)

------  
- It is possible to have the payment amount is lower than cart amount. During the checkout the shopper opens two tabs, one tab is for cart and
the other tab is for payment provider. Shopper can add more items to the cart so that the cart value is not equal to the 
amount that will be paid in the payment provider tab.

  ###### Possible solution:
  After a successful payment, validate the cart to check if the cart amount matches payment amount. 
  If not, refund the payment and let shopper to pay again.

#### BEFORE a successful payment
##### Limitations
- If the shopper never finishes (according to the stats most shoppers jump out of checkout when they actually have to pay) or cancels a payment the reserved stock with an order will not be released and thus there is a risk that simple automation (or even many users) will run the shop out of stock
------  
- There will be orders which will never be paid but shown in commercetools Merchant Center dashboard as revenue - which is not true
------  
- Not paid orders will falsely boost the concept of “best sellers” index of its products.
------  
- Creating an order does not allow you to modify the original cart anymore. What happens if a shopper forgot something and would like to change the cart just after initiation of the payment?
------  
- How to handle vouchers that can be applied only once but the shopper decided not to finish the payment and change the cart instead? It might require a new cart based on the old cart. The creation of a new cart with the same item might be an issue if an item had only stock = 1 and it has been used in not paid order already.

##### Conclusion
Both approaches have their good and bad sides, but it is recommended creating order AFTER a successful payment is less harmful.

## Payment related best practices

- Payment status changes will not be managed by the Adyen Integration library. Adyen Integration is base upon the 
transactions and custom fields in Commercetools platform.
- **Never delete or un-assign** created payment objects during the checkout from the cart. 
If required — clean up unused/obsolete payment objects by another asynchronous process instead.

## Order/Cart related best practices

- Order/Cart modifications have to be part of the shop. It is not the responsibility of the Adyen Integration modules.

## Deployment best practices

- Both modules should be deployed as a publicly exposed services.
- Modules are **stateless** which makes running multiple instances in parallel possible. It is recommended to **enable horizontal scaling** with at least 2 running instances at the same time in order to omit downtime possibility.
- An encrypted HTTPS connection is strongly recommended for production setups instead of HTTP connection.
- To protect your server from unauthorized notifications, we strongly recommend that you activate Hash-based message authentication code [HMAC signatures](../notification/docs/IntegrationGuide.md#step-1-set-up-notification-webhook-and-generate-hmac-signature) during the notification setup.
