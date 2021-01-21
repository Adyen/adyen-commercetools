#! /bin/bash

set -e

export GCLOUD_PROJECT_ID="xxx"
export GCLOUD_ZONE="xxx"
export GCLOUD_CLUSTER_NAME="xxx"
export GCLOUD_KMS_KEYRING="xxx"
export GCLOUD_KMS_KEY_NAME="xxx"
export TAG="x.x.x"
export HELM_CHARTS_VERSION="x.x.x"
export SENSITIVE_ENVS_FILE="secrets.yaml"
export PROJECT_NAME="commercetools-adyen-integration"
export HELM_CHARTS_REPO="https://github.com/commercetools/k8s-charts.git"
export ENVIRONMENT_NAME="demo"
