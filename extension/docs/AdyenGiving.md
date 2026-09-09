# Adyen Giving Integration Guide

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [How it works](#how-it-works)
- [Before you begin](#before-you-begin)
- [Step 1: Advanced checkout flow](#step-1-advanced-checkout-flow)
- [Step 2: Mounting Adyen Giving component](#step-2-mounting-adyen-giving-component)
- [Step 3: Submit donation](#step-3-submit-donation)
- [Additional notes](#additional-notes)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## How it works

This guide describes how to integrate **Adyen Giving** with the checkout flow using the extension module and Adyen Web Components.

Integration steps:

1. [Step 1](./AdvancedCheckoutFlowIntegrationGuide.md): Implement the advanced checkout flow as described in the [advanced checkout flow guide](./AdvancedCheckoutFlowIntegrationGuide.md).
2. [Step 2](#step-2-mounting-adyen-giving-component): Mount the [Adyen Giving Web Component](https://docs.adyen.com/online-payments/donations/web-component/) on the **Thank You page** when `submitAdditionalPaymentDetailsRequest` contains the `donationToken` and `donationCampaign` custom fields.
3. [Step 3](#step-3-submit-donation): Create and set the `donationRequest` custom field on the commercetools payment to submit additional payment details and finalize the donation.

---

## Before you begin

Make sure the extension module is set up and running. Follow our [How to Run Guide](./HowToRun.md) before continuing.

---

## Step 1: Advanced checkout flow

Follow the full instructions in the [Advanced Checkout Flow Integration Guide](./AdvancedCheckoutFlowIntegrationGuide.md).  
This step ensures that your base checkout flow with Adyen is working correctly before extending it with the Giving component.

---

## Step 2: Mounting Adyen Giving component

After a shopper successfully completes a payment using an Adyen payment method and an order is created in **Commercetools**, the shopper is redirected to the **Thank You page**.

If Adyen Giving is available for that payment method, the **Adyen Giving Web Component** should be displayed on this page.

### When is Adyen Giving available?

Adyen Giving is available if:

- The merchant has set up an Adyen Giving campaign.
- The shopper has selected a payment method that supports Adyen Giving.
- There is an active donation campaign for the shopper’s currency.

### How the extension module provides donation details

When submitting `submitAdditionalPaymentDetails`, the extension module checks if the `donationToken` and `donationCampaign` custom fields are set.

- **`donationToken`** – required to submit the payment donation using the [Donations API](https://docs.adyen.com/api-explorer/Checkout/71/post/donations).
- **`donationCampaign`** – required for rendering the [Adyen Giving Web Component](https://docs.adyen.com/online-payments/donations/web-component/).
  These fields are retrieved from the [donationCampaigns API](https://docs.adyen.com/api-explorer/Checkout/71/post/donationCampaigns).

👉 Follow Adyen’s documentation on [mounting the Adyen Giving component](https://docs.adyen.com/online-payments/donations/web-component/) to add it to your Thank You page.

---

## Step 3: Submit donation

When the shopper chooses to donate via the Adyen Giving component, you must send a **`donationRequest`** to complete the donation.

The component provides the necessary data in `state.data`. Forward this data to your merchant server and set it as a custom field on the commercetools payment.

### Example: Setting the donation request

```json
{
  "version": "PAYMENT_VERSION",
  "actions": [
    {
      "action": "setCustomField",
      "name": "donationRequest",
      "value": "{\"details\":{\"redirectResult\":\"Ab02b4c0!...\"}}"
    }
  ]
}
```

### Example: Donation request payload

```json
{
  "amount": {
    "currency": "EUR",
    "value": 1000
  },
  "reference": "YOUR_DONATION_REFERENCE",
  "paymentMethod": {
    "type": "scheme"
  },
  "donationToken": "YOUR_DONATION_TOKEN",
  "donationOriginalPspReference": "991559660454807J",
  "donationAccount": "NONPROFIT_ACCOUNT",
  "returnUrl": "https://your-company.example.com/...",
  "merchantAccount": "YOUR_MERCHANT_ACCOUNT",
  "shopperInteraction": "ContAuth"
}
```
