## Deployment Guide

As a quick start, you can utilize the available bash script which is capable of deploying both modules to a 
Google Cloud Project. It requires to have an existing Kubernates cluster in Google Kubernates Engine. 
Edit the configuration values in  deploy-to-gcp.sh and execute it.

| Name | Description | Required | Default value (only for test environment) |
| --- | --- | --- | --- |
|`GCLOUD_PROJECT_ID` | Google Cloud project ID | YES | |
|`GCLOUD_ZONE` | Google Cloud zone which cluster instances should be spawned [Zones](https://cloud.google.com/compute/docs/regions-zones#available). | YES | |
|`GCLOUD_CLUSTER_NAME` | Existing Google Kubernetes Engine cluster name | YES | `adyen-demo` |
|`TAG` | Indented [release version](https://github.com/commercetools/commercetools-adyen-integration/releases) of commercetools-adyen-integration | YES | `v5.0.0` |

#### Deployment best practices

- Both modules should be deployed as a publicly exposed services.
- Modules are **stateless** which makes running multiple instances in parallel possible.
It is recommended to **enable horizontal scaling**
with at least 2 running instances at the same time in order to omit downtime
possibility.
- It's also recommended to use HTTPS.
