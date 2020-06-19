# commercetools-adyen-integration
[![Build Status](https://travis-ci.org/commercetools/commercetools-adyen-integration.svg?branch=master)](https://travis-ci.org/commercetools/commercetools-adyen-integration)

This repository provides integration between commercetools and Adyen payment service provider.

## Supported payment methods
`commercetools-adyen-integration` supports the concept of [Adyen Web Components](https://docs.adyen.com/checkout/components-web).
Components are available for cards, wallets, and most local payment methods. For a list of all payment methods with an available component, refer to [Supported payment methods](https://docs.adyen.com/checkout/supported-payment-methods).

## Overview
This repository contains two standalone modules that interact with CTP and Adyen.
Complete integration requires running both of the modules.

![Overview diagram](https://user-images.githubusercontent.com/9251453/56047499-ce7dfa80-5d45-11e9-9443-aaef9da31eab.png)
- Shop communicates only with commercetools platform.
- commercetools platform communicates with the Extension module.
- Extension module communicates with Adyen payment provider.
- After Adyen returns a payment result, commercetools payment will be updated and the shop verifies and presents the result.
- When Adyen cannot fulfill the payment requirement right away, it will later send a notification as a response.
- The Notification module will process the notification and update the matching commercetools payment accordingly.    

## Extension module [![Docker Pulls](https://img.shields.io/docker/pulls/commercetools/commercetools-adyen-integration-extension)](https://hub.docker.com/repository/docker/commercetools/commercetools-adyen-integration-extension)

Extension module is a public service. When a commercetools payment object changes, the [API Extensions](https://docs.commercetools.com/http-api-projects-api-extensions) send a request to the extension module.
Then the extension module maps and sends a request to Adyen and responds with update actions back to the commercetools platform.

For more info, go to the [Extension module](./extension/README.md).

## Notification module [![Docker Pulls](https://img.shields.io/docker/pulls/commercetools/commercetools-adyen-integration-notification)](https://hub.docker.com/repository/docker/commercetools/commercetools-adyen-integration-notification)

Notification module is a public service which receives notifications sent by Adyen,
processes them and saves on a commercetools project.

For more info, go to the [Notification module](./notification/README.md).
