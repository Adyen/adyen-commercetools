## Deploy as AWS Lambda

1. For deployment to AWS Lambda, zip the `notification` folder and specify `src/lambda.js` as the entry point for the AWS Lambda function.
1. When the notification module is run as AWS Lambda **it will NOT create** the required resources like custom types for you. 
Please follow the [manual resource creation guide](../../../../notification/docs/HowToRun.md#creating-required-resources-manually) instead. 
