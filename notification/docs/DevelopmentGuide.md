<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Table of Contents**  
<!-- *generated with [DocToc](https://github.com/thlorenz/doctoc)* -->

- [Development Guide](#development-guide)
  - [Contents](#contents)
  - [Prerequisites](#prerequisites)
  - [Development](#development)

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
- Execute `npm run lint` to show lint errors in the code.

> You need to set [environment variables](docs/HowToRun.md#environment-variables) to be able to run integration tests.
