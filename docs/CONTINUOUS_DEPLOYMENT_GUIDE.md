## Continuous Deployment Guide

As a quick start, you can utilize the available bash script which is capable of deploying both modules to a 
Google Cloud Project. It requires to have:

- [gcloud sdk](https://cloud.google.com/sdk/docs/install)
- [docker](https://docs.docker.com/get-docker/)
- [helm](https://helm.sh/docs/intro/install/)
- [git](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git)
- an existing Kubernetes cluster in [Google Kubernetes Engine](https://cloud.google.com/kubernetes-engine/docs/quickstart)


Prerequisites:
1. Configure both module specific configurations in yaml files that resides under `k8s` folders.

    Refer to `extension/docs/DeploymentGuide.md` and `notification/docs/DeploymentGuide.md` docs.
2. Configure the below values in `deploy-to-gcp.sh` file
3. Ensure the `secrets.yaml` files have encrypted using the `GCLOUD_KMS_KEY_NAME`

| Name | Description | Required | Default value (only for test environment) |
| --- | --- | --- | --- |
|`GCLOUD_PROJECT_ID` | Google Cloud project ID | YES | |
|`GCLOUD_ZONE` | Google Cloud [Zones](https://cloud.google.com/compute/docs/regions-zones#available) which cluster instances should be spawned. | YES | |
|`GCLOUD_CLUSTER_NAME` | Existing Google Kubernetes Engine cluster name | YES | `adyen-demo` |
|`GCLOUD_KMS_KEYRING` | Google KMS [key-ring](https://cloud.google.com/kms/docs/resource-hierarchy#key_rings) which include the encrypted key for secret.yaml files | YES | `adyen-integration-deployment-demo` |
|`GCLOUD_KMS_KEY_NAME` | Google KMS key name which used to encrypt the secret.yaml files | YES | `adyen-extension-module` |
|`TAG` | Indented [release version](https://github.com/commercetools/commercetools-adyen-integration/releases) of commercetools-adyen-integration | YES | `v5.0.0` |
|`HELM_CHARTS_REPO` | Github repository URL for helm charts | NO | `https://github.com/commercetools/k8s-charts.git` |
|`HELM_CHARTS_VERSION` | Intended release version of the helm charts repository | YES | `1.7.5` |
|`ENVIRONMENT_NAME` | Folder name that contains secrets.yaml file in `extension/k8s` and `notification/k8s` | YES | `demo` |

After configured all the required values, execute the `deploy-to-gcp.sh` script file.
```
./deploy-to-gcp.sh
```



