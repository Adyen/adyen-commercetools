<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Table of Contents**  *generated with [DocToc](https://github.com/thlorenz/doctoc)*

- [Development Guide](#development-guide)
  - [Contents](#contents)
  - [Prerequisites](#prerequisites)
  - [Development](#development)
      - [E2E tests](#e2e-tests)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# Development Guide

## Contents
- [Prerequisites](#prerequisites)
- [Development](#development)

## Prerequisites

Minimum requirements are:
 - **Node.js** version 12.
 - **Npm** version 6.
 
You can install all dependencies using `npm` with following command:

```
npm install
```

## Development
While developing project you can use some predefined commands for running tests, running linter or generating coverage. 
 
- Execute `npm run test` to run all tests and print the code coverage report.
- Execute `npm run unit` to run [Unit tests](../test/unit)
- Execute `npm run integration` to run [Integration tests](../test/integration) 
- Execute `npm run e2e` to run [E2e tests](../test/e2e)
- Execute `npm run lint` to show lint errors in the code.

> You need to set [environment variables](./DeploymentGuide.md#environment-variables) to be able to run integration and e2e tests.
 Additionally, there could be more environmental variables needed for tests. See the next sections of this documentation.

#### E2E tests
Following additional environment variables must be provided in order to run the E2E tests.
| Name | Content | Required | Default value |
|`ADYEN_CLIENT_KEY` | Client-side key that is required to render a Component. See [Adyen documentation](https://docs.adyen.com/development-resources/client-side-authentication#get-your-client-key). | YES | |
