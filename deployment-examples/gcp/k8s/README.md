## Continuous Deployment Guide

As a quick start, you can utilize the available bash script which is capable of deploying both modules to a 
Google Kubernetes Engine.

> Note: In the script we are using our [public-service](https://github.com/commercetools/k8s-charts/tree/master/charts/public-service) helm chart to be able deploy an 
> instance of a publicly available service on a K8s cluster (via HTTP from outside the cluster).

### Prerequisites:

- [gcloud sdk](https://cloud.google.com/sdk/docs/install)
- [docker](https://docs.docker.com/get-docker/)
- [helm](https://helm.sh/docs/intro/install/)
- [git](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git)
- An existing Kubernetes cluster in [Google Kubernetes Engine](https://cloud.google.com/kubernetes-engine/docs/quickstart)
- Configure both module specific configurations in yaml files that resides under `k8s` folders.
    Refer to [`extension/docs/HowToRun.md`](../../../extension/docs/HowToRun.md) and [`notification/docs/HowToRun.md`](../../../notification/docs/HowToRun.md) docs.
- Configure the below environment variable values in [`env-config.sh`](env-config.sh) file.

| Name | Description |
| --- | --- |
|`GCLOUD_PROJECT_ID` | Google Cloud project ID |
|`GCLOUD_ZONE` | Google Cloud [Zones](https://cloud.google.com/compute/docs/regions-zones#available) which cluster instances should be spawned. |
|`GCLOUD_CLUSTER_NAME` | Existing Google Kubernetes Engine cluster name |
|`GCLOUD_KMS_KEYRING` | Google KMS [key-ring](https://cloud.google.com/kms/docs/resource-hierarchy#key_rings) which include the encrypted key for secret.yaml files |
|`GCLOUD_KMS_KEY_NAME` | Google KMS key name which used to encrypt the secret.yaml files |
|`TAG` | Indented [release version](https://github.com/commercetools/commercetools-adyen-integration/releases) of commercetools-adyen-integration |
|`HELM_CHARTS_VERSION` | Intended release version of the helm charts repository |
|`ENVIRONMENT_NAME` | Folder name that contains secrets.yaml file in `extension/k8s` and `notification/k8s` |

- Ensure the `secrets.yaml` files ([extension](extension/demo/secrets.yaml) and [notification](notification/demo/secrets.yaml)) have encrypted using the `GCLOUD_KMS_KEY_NAME` key.

After configured all the required environment variables, execute the [`deploy-to-gcp.sh`](deploy-to-gcp.sh) script file.
```
./deploy-to-gcp.sh
```



