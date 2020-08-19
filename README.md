# commercetools-adyen-integration
[![Build Status](https://travis-ci.org/commercetools/commercetools-adyen-integration.svg?branch=master)](https://travis-ci.org/commercetools/commercetools-adyen-integration)

`commercetools-adyen-integration` provides an integration between the commercetools and Adyen payment service provider based on the concept of [Adyen Web Components](https://docs.adyen.com/checkout/components-web).
Components are available for cards, wallets, and most local payment methods. For a list of all payment methods with an available component, refer to [Supported payment methods](https://docs.adyen.com/checkout/supported-payment-methods).

## Overview
This repository contains two standalone modules that interact with commercetools and Adyen.
Complete integration requires running both of the modules.

![Overview diagram](https://user-images.githubusercontent.com/3469524/86220256-9f8ab900-bb83-11ea-963a-243e9992283f.jpg)
1. The shopper does a checkout and starts the payment process.
2. Shop communicates only with the commercetools to process payment.
3. The commercetools platform communicates with the extension module.
4. The extension module communicates with the Adyen payment provider.
5. Adyen returns a payment result to the extension module.
6. The extension module updates the commercetools payment.
7. The shop verifies the updated payment.
8. The shop presents the results to the shopper.

## Extension module 

[![Docker Pulls](https://img.shields.io/docker/pulls/commercetools/commercetools-adyen-integration-extension)](https://hub.docker.com/r/commercetools/commercetools-adyen-integration-extension)

The extension module is a publicly exposed service that acts as a middleware between the commercetools platform and Adyen. 
Once [commercetools HTTP API Extensions](https://docs.commercetools.com/http-api-projects-api-extensions) is configured to call Adyen extension module, for every payment create or update request an Adyen extension will be remotely called by the commercetools platform.

- Follow [Integration Guide](./extension/docs/WebComponentsIntegrationGuide.md) for information how to integrate your shop with this module.
- Follow [Deployment Guide](./extension/docs/DeploymentGuide.md) to run extension module.
- Follow [Development Guide](./extension/docs/DevelopmentGuide.md) if you want to contribute to it.

## Notification module 

[![Docker Pulls](https://img.shields.io/docker/pulls/commercetools/commercetools-adyen-integration-notification)](https://hub.docker.com/r/commercetools/commercetools-adyen-integration-notification)

Notification module is a publicly exposed service which receives asynchronous notifications sent by Adyen, 
Through notifications, Adyen provides asynchronously payment status changes like authorization, charge, or refund of the payment.
The notification module will process the notification and update the matching commercetools payment accordingly.

- Follow [Integration Guide](./notification/docs/IntegrationGuide.md) for information how to integrate with notification module.
- Follow [Deployment Guide](./notification/docs/DeploymentGuide.md) to run notification module.
- Follow [Development Guide](./notification/docs/DevelopmentGuide.md) if you want to contribute to it.
