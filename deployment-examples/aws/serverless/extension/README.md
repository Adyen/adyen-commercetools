## Deploy as AWS Lambda

1. Run 'npm run zip-lambda-function'. It helps to execute following steps
   - Rename index.lambda.js to index.js
   - For deployment to AWS Lambda, bundle the following files and folders into a .zip file and upload it in AWS console.
      - src
      - node_modules
      - resources
      - index.js
      - package.json
2. Specify `index.handler` as the entry point for the AWS Lambda function.
 > The default value in the console is index.handler which calls exports.handler in index.js
3. When the extension module is run as AWS Lambda **it will NOT create** the required resources like custom types or commercetools API extension for you. 
Please follow the [manual resource creation guide](../../../../extension/docs/HowToRun.md#creating-required-resources-manually) instead. 
