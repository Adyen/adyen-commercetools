#! /bin/bash

set -e

source ./env-config.sh

## set Google Cloud Project settings
echo "Login to gcloud SDK and select project"
gcloud config set project "$GCLOUD_PROJECT_ID"
gcloud config set compute/zone "$GCLOUD_ZONE"

echo "Build and push docker images to Google Container Registry(eu.gcr.io)"
# if required to use docker-hub, consider using -> gcloud auth configure-docker

EXTENSION_IMAGE="${PROJECT_NAME}-extension"
NOTIFICATION_IMAGE="${PROJECT_NAME}-notification"
GCR_PATH="eu.gcr.io/${GCLOUD_PROJECT_ID}"
EXTENSION_IMAGE_FULL="${GCR_PATH}/${EXTENSION_IMAGE}"
NOTIFICATION_IMAGE_FULL="${GCR_PATH}/${NOTIFICATION_IMAGE}"

## 1. Build and Push Docker images
docker build -t "$EXTENSION_IMAGE" ./../../../extension
docker tag "$EXTENSION_IMAGE" "$EXTENSION_IMAGE_FULL:$TAG"
docker push -- "$EXTENSION_IMAGE_FULL"

docker build -t "$NOTIFICATION_IMAGE" ./../../../notification
docker tag "$NOTIFICATION_IMAGE" "$NOTIFICATION_IMAGE_FULL:$TAG"
docker push -- "$NOTIFICATION_IMAGE_FULL"

## 2. Download helm charts repository
printf "\n- Cloning commercetools/k8s-charts repo..\n"
git clone --branch="$HELM_CHARTS_VERSION" --depth=1 "$HELM_CHARTS_REPO"/

## 3. Connect to the gcloud kubernetes cluster
printf "\n- Connecting to the gcloud cluster with name: [%s] in [%s]..\n" "$GCLOUD_CLUSTER_NAME" "$GCLOUD_ZONE"
gcloud container clusters get-credentials "$GCLOUD_CLUSTER_NAME" --zone="$GCLOUD_ZONE"

## 4. Decrypt secret values file using Google KMS
gcloud kms decrypt \
          --location="global" \
          --keyring="${GCLOUD_KMS_KEYRING}" \
          --key="${GCLOUD_KMS_KEY_NAME}" \
          --ciphertext-file="./extension/${ENVIRONMENT_NAME}/${SENSITIVE_ENVS_FILE}.enc" \
          --plaintext-file="./extension/${ENVIRONMENT_NAME}/${SENSITIVE_ENVS_FILE}"

gcloud kms decrypt \
          --location="global" \
          --keyring="${GCLOUD_KMS_KEYRING}" \
          --key="${GCLOUD_KMS_KEY_NAME}" \
          --ciphertext-file="./notification/${ENVIRONMENT_NAME}/${SENSITIVE_ENVS_FILE}.enc" \
          --plaintext-file="./notification/${ENVIRONMENT_NAME}/${SENSITIVE_ENVS_FILE}"

## 5. Deploying to both modules to kubernetes using helm charts
cd k8s-charts/charts/public-service
echo "Upgrading helm for extension module"
helm upgrade --install \
    --namespace $ENVIRONMENT_NAME \
    commercetools-adyen-integration-extension \
    -f ./../../../extension/values.yaml \
    -f ./../../../extension/$ENVIRONMENT_NAME/values.yaml \
    -f ./../../../extension/$ENVIRONMENT_NAME/${SENSITIVE_ENVS_FILE} \
    .

echo "Upgrading helm for notification module"
helm upgrade --install \
    --namespace $ENVIRONMENT_NAME \
    commercetools-adyen-integration-notification \
    -f ./../../../notification/values.yaml \
    -f ./../../../notification/$ENVIRONMENT_NAME/values.yaml \
    -f ./../../../notification/$ENVIRONMENT_NAME/${SENSITIVE_ENVS_FILE} \
    .

# Consider executing following 3 commands, if Tiller agent is not available in your kubernetes cluster:
# - kubectl -n kube-system create serviceaccount tiller
# - kubectl create clusterrolebinding tiller --clusterrole cluster-admin --serviceaccount=kube-system:tiller
# - helm init --service-account tiller

## 6. Deployed kubernetes cluster information
printf "Current cluster state:\n"
printf "Helms:\n%s\n\n" "$(helm list)"
printf "Deployments:\n%s\n\n" "$(kubectl get deployments -n $ENVIRONMENT_NAME)"
printf "Pods:\n%s\n\n" "$(kubectl get pods -n $ENVIRONMENT_NAME)"
