## Deploy as AWS Lambda

1. In order to setup the extension module config, follow our [how to run guide](../../../../extension/docs/HowToRun.md).
2. Extension module requires `ADYEN_INTEGRATION_CONFIG` as `environment variable`.
3. Deployments work by uploading an archive containing your function's source code and their dependencies. 
You could use a deployment package to deploy your function code to Lambda.
To bundle the extension module, navigate into `extension` folder and run `npm run zip-lambda-function`. 
4. Specify `index.handler` as the entry point for the AWS Lambda function.
    > The default value in the console is index.handler which calls exports.handler in index.js
5. Please check our [faq](../../../../docs/FAQ.md) for your deployment.

### Helpful Links: 
- [commercetools HTTP API Extension](https://docs.commercetools.com/api/projects/api-extensions#http-destination)
- [Building Lambda functions with Node.js](https://docs.aws.amazon.com/lambda/latest/dg/lambda-nodejs.html)
- [Deploy Node.js Lambda functions with .zip file archives](https://docs.aws.amazon.com/lambda/latest/dg/nodejs-package.html)
- [Using AWS Lambda with Amazon API Gateway](https://docs.aws.amazon.com/lambda/latest/dg/services-apigateway.html)
