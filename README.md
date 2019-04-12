# commercetools-adyen-integration
This repository provides integration between Commercetools and Adyen payment service provider.

#### Supported payment methods
- Credit card with 3DS payment  
- Paypal payment

This repository contains two standalone modules that connects the two platforms.
In order to make the integration run properly, both modules have to run.

## Overview
![Overview diagram](https://user-images.githubusercontent.com/9251453/56028783-2eaa7780-5d19-11e9-978c-1abf19e8e7ad.png)
1. Shop communicates only with CTP platform.
1. CTP platform communicates with the Extension module.
1. Extension module communicates with Adyen.
1. After Adyen returns a result, CTP payment object will be updated and the shop verifies and presents the result.  
1. When Adyen cannot fulfill the payment requirement right away, it will later send a notification as a response.
1. The Notification module will process the notification and update the matching payment accordingly.    

## Extension module
Extension module interacts between CTP Platform and Adyen using [API Extensions](https://docs.commercetools.com/http-api-projects-api-extensions).
1. Read [Integration Guide](./extension/docs/IntegrationGuide.md) for information how to integrate your shop with this module.  
1. Read [Development Guide](./extension/docs/DevelopmentGuide.md) if you want to run the extension module by yourself or contribute to it.

## Notification module  
