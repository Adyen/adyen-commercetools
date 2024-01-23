<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
- [Contribution Guide](#contribution-guide)
  - [Prerequisites](#prerequisites)
  - [Development](#development)
    - [Debugging](#debugging)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# Contribution Guide

## Prerequisites

Minimum requirements are:
 - **Node.js** version 18.
 - **Npm** version 6.
 
You can install all dependencies using `npm` with following command:

```
npm install
```

## Development
While developing project you can use some predefined commands for running tests, running linter or generating coverage. 

- Execute `npm run test-ci` to run all tests and print the code coverage report.
- Execute `npm run unit` to run Unit tests.
- Execute `npm run integration` to run Integration tests. (environment variable for [extension](../extension/docs/HowToRun.md#environment-variable) and [notification](../notification/docs/HowToRun.md#environment-variable) needs to be set)
- Extension module only: Execute `npm run e2e` to run E2e tests. (environment variable for [extension](../extension/docs/HowToRun.md#environment-variable) needs to be set)
- Execute `npm run lint` to show lint errors in the code.
- Execute `npm run format` to format the code before committing.
- Execute `npm run test` to pre-run the build before the deployment in [Commercetools Connect](https://docs.commercetools.com/connect)

### Debugging

E2E tests using [puppeteer](https://github.com/puppeteer/puppeteer) library for testing payment sandbox UI's on the Chrome browser. Refer to puppeteer [debugging tips](https://github.com/puppeteer/puppeteer#debugging-tips) documentation such as turning off headless mode and using nodejs debugger, which might be useful to develop new UI integration or troubleshooting UI flow.
Addition to the tips provided by puppeteer, if you're using IntelliJ Idea, you could also debug using the build-in Mocha test runner since the tests using Mocha.
