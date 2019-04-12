# commercetools-adyen-integration
This repository provides integration between Commercetools and Adyen payment service provider.

#### Supported payment methods
- Credit card with 3DS payment  
- Paypal payment

This repository contains two standalone modules that connects the two platforms.
In order to make the integration run properly, both modules have to run.

## Overview
![Overview diagram](https://user-images.githubusercontent.com/9251453/56045959-86110d80-5d42-11e9-9c0f-21ce651594e3.png)
1. Shop communicates only with commercetools platform.
1. commercetools platform communicates with the Extension module.
1. Extension module communicates with Adyen payment provider.
1. After Adyen returns a payment result, commercetools payment resource will be updated and the shop verifies and presents the result.
1. When Adyen cannot fulfill the payment requirement right away, it will later send a notification as a response.
1. The Notification module will process the notification and update the matching commercetools payment accordingly.    

## Extension module
Extension module is a public service. When CTP Payments change, It receives calls from 
[API Extensions](https://docs.commercetools.com/http-api-projects-api-extensions),
maps and sends the request to Adyen and then returns update actions back to API Extensions.

1. Read [Integration Guide](./extension/docs/IntegrationGuide.md) for information how to integrate your shop with this module.  
1. Read [Development Guide](./extension/docs/DevelopmentGuide.md) if you want to run the extension module by yourself or contribute to it.

## Notification module  
