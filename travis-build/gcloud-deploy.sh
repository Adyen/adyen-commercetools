#! /bin/bash

set -e

ENVIRONMENT_NAME="$1"
SCRIPT_DIR="$(dirname "$0")"
. "${SCRIPT_DIR}/common.sh"
HELM_UPGRADE_SCRIPT="${SCRIPT_DIR}/helm-upgrade.sh"

printf "\n- Verifying mandatory envs: [GCLOUD_ZONE GCLOUD_CLUSTER_NAME_PREFIX, PROJECT_NAME, ENVIRONMENT_NAME, HELM_CHART_TEMPLATE_NAME, HELM_VALUES_DIR, DOCKER_TAG]..\n"
verifyMandatoryValues GCLOUD_ZONE GCLOUD_CLUSTER_NAME_PREFIX PROJECT_NAME ENVIRONMENT_NAME HELM_CHART_TEMPLATE_NAME HELM_VALUES_DIR DOCKER_TAG

# 1. Set environment variables needed for deployment scripts
printf "\n- Building environment variable [%s]..\n" "GCLOUD_CLUSTER_NAME"
case "$ENVIRONMENT_NAME" in
    staging|production|demo)
        GCLOUD_CLUSTER_NAME="${GCLOUD_CLUSTER_NAME_PREFIX}-${ENVIRONMENT_NAME}"
        ;;
    *)
        echo "Invalid 'ENVIRONMENT_NAME' value in $0. Please use either 'staging' or 'production'."
        exit 1
esac

# 2. Connect to the gcloud cluster
printf "\n- Connecting to the gcloud cluster with name: [%s] in [%s]..\n" "$GCLOUD_CLUSTER_NAME" "$GCLOUD_ZONE"
gcloud container clusters get-credentials "$GCLOUD_CLUSTER_NAME" --zone="$GCLOUD_ZONE"

# 3. Decrypt secrets
. "./extension/k8s/crypt/decrypt.sh"

# 4. Deploy all the helm charts of the repo
$HELM_UPGRADE_SCRIPT "$PROJECT_NAME" "$ENVIRONMENT_NAME" "$HELM_CHART_TEMPLATE_NAME" "$HELM_VALUES_DIR" "$DOCKER_TAG"

# 5. Print info about current cluster state
printf "Current cluster state:\n"
printf "Helms:\n%s\n\n" "$(helm list)"
printf "Deployments:\n%s\n\n" "$(kubectl get deployments)"
printf "Cronjobs:\n%s\n\n" "$(kubectl get cronjobs)"
printf "Pods:\n%s\n\n" "$(kubectl get pods)"
