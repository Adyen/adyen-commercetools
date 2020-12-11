<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Table of Contents**  
<!-- *generated with [DocToc](https://github.com/thlorenz/doctoc)* -->

- [Deploy as AWS Lambda](#deploy-as-aws-lambda)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Deploy as AWS Lambda

1. For deployment to AWS Lambda, zip the extensions folder and specify `src/lambda.handler` as the entry point for the AWS Lambda function.
2. When the extension module is run as AWS Lambda **it will NOT create** the required resources like custom types or commercetools API extension for you. Please follow the [manual resource creation guide](#creating-resources-manually) instead. 
