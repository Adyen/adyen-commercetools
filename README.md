# commercetools-adyen-integration
This repository provides integration between Commercetools and Adyen payment service provider.

#### Supported payment methods
- Credit card with 3DS payment  
- Paypal payment

This repository contains two standalone modules that connects the two platforms.
In order to make the integration run properly, both modules have to run.

## Overview
![Overview diagram](https://user-images.githubusercontent.com/9251453/56047499-ce7dfa80-5d45-11e9-9443-aaef9da31eab.png)
- Shop communicates only with commercetools platform.
- commercetools platform communicates with the Extension module.
- Extension module communicates with Adyen payment provider.
- After Adyen returns a payment result, commercetools payment will be updated and the shop verifies and presents the result.
- When Adyen cannot fulfill the payment requirement right away, it will later send a notification.
- The Notification module will process the notification and update the matching commercetools payment accordingly.    

## Extension module
Extension module is a public service. When CTP Payments change, It receives calls from 
[API Extensions](https://docs.commercetools.com/http-api-projects-api-extensions),
maps and sends the request to Adyen and then returns update actions back to API Extensions.

1. Read [Integration Guide](./extension/docs/IntegrationGuide.md) for information how to integrate your shop with this module.  
1. Read [Development Guide](./extension/docs/DevelopmentGuide.md) if you want to run the extension module by yourself or contribute to it.

## Notification module  
