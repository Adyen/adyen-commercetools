<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Table of Contents** 

- [Development Guide](#development-guide)
  - [Prerequisites](#prerequisites)
  - [Development](#development)
    - [Contribution](#contribution)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# Development Guide

**Contents**
- [Prerequisites](#prerequisites)
- [Development](#development)
- [Contribution](#contribution)

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
Before running integration tests you need to set right environment variables, [check here](./DeploymentGuide.md#parameters) for the list.

- Execute `npm run test` to run all tests. In the end a code coverage report will be printed.
- Execute `npm run unit` to run [Unit tests](../test/unit)
- Execute `npm run integration` to run [Integration tests](../test/integration) 
- Execute `npm run e2e` to run [E2e tests](../test/e2e)
- Execute `npm run lint` to show lint errors in the code.

### Contribution

- Every PR should address an issue on the repository. If the issue doesn't exist, please create it first.
- Pull requests should always follow the following naming convention: `[issue-number]-[pr-name]`. For example, `12-update-payment-custom-type`.
