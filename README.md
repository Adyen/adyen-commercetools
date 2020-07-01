# commercetools-adyen-integration
[![Build Status](https://travis-ci.org/commercetools/commercetools-adyen-integration.svg?branch=master)](https://travis-ci.org/commercetools/commercetools-adyen-integration)

`commercetools-adyen-integration` provides an integration between the commercetools and Adyen payment service provider to support the concept of [Adyen Web Components](https://docs.adyen.com/checkout/components-web).
Components are available for cards, wallets, and most local payment methods. For a list of all payment methods with an available component, refer to [Supported payment methods](https://docs.adyen.com/checkout/supported-payment-methods).

## Overview
This repository contains two standalone modules that interact with commercetools and Adyen.
Complete integration requires running both of the modules.

![Overview diagram](https://user-images.githubusercontent.com/3469524/86220256-9f8ab900-bb83-11ea-963a-243e9992283f.jpg)
1. Shopper does a checkout and starts the payment process.
2. Shop communicates only with the commercetools to process payment.
3. The commercetools platform communicates with the Extension module.
4. Extension module communicates with Adyen payment provider.
5. Adyen returns a payment result to Extension module.
6. Extension module updates the commercetools payment.
7. Shop verifies the updated payment.
8. Shop presents the results to the Shopper.

> When Adyen cannot fulfill the payment requirement right away, it will later send a notification to Notification module as a response.
The Notification module will process the notification and update the matching commercetools payment accordingly.    

## Extension module [![Docker Pulls](https://img.shields.io/docker/pulls/commercetools/commercetools-adyen-integration-extension)](https://hub.docker.com/r/commercetools/commercetools-adyen-integration-extension)

Extension module is a publicly exposed service which acts as a middleware between the commercetools platform and Adyen. 
Extension module is called remotely from the commercetools platform with the [commercetools HTTP API Extensions](https://docs.commercetools.com/http-api-projects-api-extensions) 
before processing of a create or update request of a commercetools payment.

For more info, refer to the [Extension module](./extension/README.md) documentation.

## Notification module [![Docker Pulls](https://img.shields.io/docker/pulls/commercetools/commercetools-adyen-integration-notification)](https://hub.docker.com/r/commercetools/commercetools-adyen-integration-notification)

Notification module is a public service which receives notifications sent by Adyen,
processes them and saves on the commercetools project.

For more info, refer to the [Notification module](./notification/README.md) documentation.
