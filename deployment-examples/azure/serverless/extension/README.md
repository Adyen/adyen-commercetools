## Deploy as Azure function app

1. In order to setup the extension module config, follow our [how to run guide](../../../../extension/docs/HowToRun.md).
2. Extension module requires `ADYEN_INTEGRATION_CONFIG` as `environment variable`.
3. Deployments work by uploading an archive containing your function's source code and their dependencies. 
You could use a deployment package to deploy your function code to Azure function app.
To bundle the extension module, navigate into `extension` folder and run `npm run zip-azure-function`. 
4. To change the configuration of extension function, please check [function.json](../../../../extension/extension-trigger/function.json) and [host.json](../../../../extension/host.json).
   By default, the Functions runtime looks for your function in index.js.
    > In the default case, your exported function should be the only export from its file or the export named run or index.
5. Please check our [FAQ](../../../../docs/FAQ.md) for your deployment.

### Helpful Links: 
- [Azure function app and config settings - host.json](https://docs.microsoft.com/en-us/azure/azure-functions/functions-host-json)
- [Azure functions and config settings - function.json](https://docs.microsoft.com/en-us/azure/azure-functions/functions-reference?tabs=blob)
- [commercetools HTTP API Extension](https://docs.commercetools.com/api/projects/api-extensions#http-destination)
- [Building Javascript_Azure_Function_App](https://docs.microsoft.com/en-us/azure/azure-functions/functions-reference-node)
- [Deploy Azure function apps with .zip file archives](https://docs.microsoft.com/en-us/azure/azure-functions/deployment-zip-push)
