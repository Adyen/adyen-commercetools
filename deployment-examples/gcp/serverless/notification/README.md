## Deploy as GCP Cloud Function

1. In order to setup the notification module config, follow our [how to run guide](../../../../notification/docs/HowToRun.md).
2. Notification module requires `ADYEN_INTEGRATION_CONFIG` as `Runtime environment variable`.
3. Deployments work by uploading an archive containing your function's source code to a Google Cloud Storage bucket.
To bundle the extension module, navigate to in `notification` folder run `npm run zip-google-function`. 
4. Specify the `notificationTrigger` as the entry point function in your GCP Cloud Function configuration.
5. Please check our general [best practices](../../../../docs/BEST_PRACTICES.md) for your deployment.

### Helpful Links: 
- [commercetools HTTP API Extension](https://docs.commercetools.com/api/projects/api-extensions#http-destination)
- [Official Node.js Quickstart Guide](https://cloud.google.com/functions/docs/quickstart-nodejs)
- [Deplpoying Cloud Functions](https://cloud.google.com/functions/docs/deploying)
- [Deploying from Cloud Console](https://cloud.google.com/functions/docs/deploying/console)
