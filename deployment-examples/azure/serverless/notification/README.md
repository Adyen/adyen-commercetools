## Deploy as Azure function app

1. In order to setup the notification module config, follow our [how to run guide](../../../../notification/docs/HowToRun.md).
2. Extension module requires `ADYEN_INTEGRATION_CONFIG` as `environment variable` or `.notificationrc` file to configure with [external file configuration](../../../../notification/docs/HowToRun.md#external-file-configuration).
3. Deployments work by uploading an archive containing your function's source code and their dependencies. 
You could use a deployment package to deploy your function code to Azure function app.
To bundle the notification module, navigate into `notification` folder and run `npm run zip-azure-function`. 
4. By default, the Functions runtime looks for your function in index.js.
    > In the default case, your exported function should be the only export from its file or the export named run or index.
5. Please check our [FAQ](../../../../docs/FAQ.md) for your deployment.

### Helpful Links: 
- [commercetools HTTP API Extension](https://docs.commercetools.com/api/projects/api-extensions#http-destination)
- [Building Javascript_Azure_Function_App](https://docs.microsoft.com/en-us/azure/azure-functions/functions-reference-node)
- [Deploy Azure function apps with .zip file archives](https://docs.microsoft.com/en-us/azure/azure-functions/deployment-zip-push)
