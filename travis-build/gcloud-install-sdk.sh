#! /bin/bash

set -e

echo "Install gcloud SDK, Helm (if not cached yet)"

# verify mandatory values
. "$(dirname "$0")/common.sh"
verifyMandatoryValues GCLOUD_HOME GCLOUD_PATH_APPLY HELM_VERSION HELM_HOME

if [ ! -f "$GCLOUD_PATH_APPLY" ]; then
  echo Installing gcloud SDK
  rm -rf "$GCLOUD_HOME"
  export CLOUDSDK_CORE_DISABLE_PROMPTS=1 # SDK installation is interactive, thus prompts must be disabled
  curl "https://sdk.cloud.google.com" | bash > /dev/null
fi

if [ ! -f "$HELM_HOME/helm" ]; then
  echo Installing Helm
  mkdir -p "$HELM_HOME"
  wget -qO- https://storage.googleapis.com/kubernetes-helm/helm-${HELM_VERSION}-linux-amd64.tar.gz | tar zxv -C "$HELM_HOME"
  mv "$HELM_HOME/linux-amd64/helm" "$HELM_HOME"
  rm -rf "$HELM_HOME/linux-amd64"
fi

. "$GCLOUD_PATH_APPLY"
gcloud version

gcloud config set disable_usage_reporting true
gcloud --quiet components update kubectl
