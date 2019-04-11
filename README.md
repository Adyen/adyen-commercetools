# commercetools-adyen-integration
This repository provides integration between Commercetools and Adyen payment service provider.

It contains two standalone modules that connects the two platforms.
In order to make the integration run properly, both modules have to run.

## Extension module
Extension module interacts between CTP Platform and Adyen using [API Extensions](https://docs.commercetools.com/http-api-projects-api-extensions).
1. Read [Integration Guide](./extension/docs/IntegrationGuide.md) for information how to integrate your shop with this module.  
1. Read [Development Guide](./extension/docs/DevelopmentGuide.md) if you want to run the extension module by yourself or contribute to it.

## Notification module
Notification module is a public service which receives notifications sent by Adyen,
processes them and saves on a commercetools project.

