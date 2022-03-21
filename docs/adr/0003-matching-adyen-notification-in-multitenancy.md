# 3. Matching Adyen Notification with commercetools project in a multitenancy setup

Date: 2021-01-15

## Status

[Accepted](https://github.com/commercetools/commercetools-adyen-integration/pull/541)

## Context

In a multitenancy setup, there are multiple commercetools projects in one notification module instance.
When a notification comes from Adyen, the notification module needs to find the correct commercetools project for the notification.
There are 2 possible options to tackle this problem:

1. The commercetools project name is a part of the notification callback URL (e.g. URL path) that is set up in Adyen Admin.
1. The commercetools project name is an attribute in the notification itself.

The solution should be as less work as possible for the user of the integration. Additionally, it should work in a serverless environment where the URL to the function could be randomly generated.

## Decision
- We will have an attribute in the notification itself. Its value will be the commercetools project name that the notification belongs to.
- In order to have the commercetools project name in every notification, we will use [`metadata` attribute](https://docs.adyen.com/api-explorer/#/CheckoutService/v66/post/payments__reqParam_metadata). This attribute will be set in the extension module in every request to Adyen.
- The value for `metadata` attribute will be taken from a custom field `custom.fields.commercetoolsProjectKey`. Its value will be set by the user of the integration.

## Consequences
- `custom.fields.commercetoolsProjectKey` will be a required field for every payment. This will be validated in the extension module.
- `custom.fields.commercetoolsProjectKey` will be sent as `metadata.ctProjectKey` to Adyen with every request from the extension module.
- To select the right commercetools project in the notification module, the notification module will get the commercetools project key from the field `notificationItems.NotificationRequestItem.metadata.ctProjectKey` in the notification.
