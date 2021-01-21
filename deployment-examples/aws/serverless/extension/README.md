## Deploy as AWS Lambda

1. For deployment to AWS Lambda, zip the extensions folder and specify `src/lambda.handler` as the entry point for the AWS Lambda function.
2. When the extension module is run as AWS Lambda **it will NOT create** the required resources like custom types or commercetools API extension for you. 
Please follow the [manual resource creation guide](../../../../extension/docs/HowToRun.md#creating-required-resources-manually) instead. 
