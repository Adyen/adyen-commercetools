# commercetools-adyen-integration
![Build Status](https://github.com/commercetools/commercetools-adyen-integration/workflows/CI/badge.svg?branch=master)

`commercetools-adyen-integration` provides an integration between the commercetools and Adyen payment service provider based on the concept of [Adyen Web Components](https://docs.adyen.com/checkout/components-web).
Components are available for cards, wallets, and most local payment methods. For a list of all payment methods with an available component, refer to [Supported payment methods](https://docs.adyen.com/checkout/supported-payment-methods).

> Note: as `commercetools-adyen-integration` relies on the usage of Adyen's web components it does not need to process sensitive credit card data and thus is fully PCI DSS **compliant**.

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Overview](#overview)
- [Extension module](#extension-module)
- [Notification module](#notification-module)
- [Contribution Guide](#contribution-guide)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

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
- Follow [How to run](extension/docs/HowToRun.md) the extension module.

## Notification module 

[![Docker Pulls](https://img.shields.io/docker/pulls/commercetools/commercetools-adyen-integration-notification)](https://hub.docker.com/r/commercetools/commercetools-adyen-integration-notification)

Notification module is a publicly exposed service which receives asynchronous notifications sent by Adyen, 
Through notifications, Adyen provides asynchronously payment status changes like authorization, charge, or refund of the payment.
The notification module will process the notification and update the matching commercetools payment accordingly.

- Follow [Integration Guide](./notification/docs/IntegrationGuide.md) for information how to integrate with notification module.
- Follow [How to run](notification/docs/HowToRun.md) the notification module.

## Contribution Guide

- Follow the [Contribution Guide](docs/ContributionGuide.md) if you would like to run modules locally.
