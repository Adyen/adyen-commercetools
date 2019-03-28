#! /bin/bash

set -e

APPLICATION_NAME="$1"
ENVIRONMENT_NAME="$2"
HELM_CHART_TEMPLATE_NAME="$3"
HELM_VALUES_DIR="$4"
IMAGE_TAG="$5"
SCRIPT_DIR="$(dirname "$0")"
CHARTS_DIR="${SCRIPT_DIR}/../../chart-templates/charts"

printf "\n- Verifying mandatory envs: [APPLICATION_NAME, ENVIRONMENT_NAME, HELM_CHART_TEMPLATE_NAME, HELM_VALUES_DIR, IMAGE_TAG]..\n"
. "${SCRIPT_DIR}/common.sh"
verifyMandatoryValues APPLICATION_NAME ENVIRONMENT_NAME HELM_CHART_TEMPLATE_NAME HELM_VALUES_DIR IMAGE_TAG

COMMON_INSENSITIVE_ENVS_FILE="$HELM_VALUES_DIR/values.yaml"
ENVIRONMENT_SPECIFIC_INSENSITIVE_ENVS_FILE="$HELM_VALUES_DIR/$ENVIRONMENT_NAME/values.yaml"
SENSITIVE_ENVS_FILE="$HELM_VALUES_DIR/$ENVIRONMENT_NAME/secrets.yaml"

printf "\n- Upgrading [%s] helm chart template with release name: [%s] on [%s] environment.\n" "$HELM_CHART_TEMPLATE_NAME" "$APPLICATION_NAME" "$ENVIRONMENT_NAME"
helm upgrade --install "$APPLICATION_NAME" --namespace "$ENVIRONMENT_NAME" \
    $(execOptionIfFileExistsAndIsReadable "$COMMON_INSENSITIVE_ENVS_FILE" "-f") \
    $(execOptionIfFileExistsAndIsReadable "$ENVIRONMENT_SPECIFIC_INSENSITIVE_ENVS_FILE" "-f") \
    $(execOptionIfFileExistsAndIsReadable "$SENSITIVE_ENVS_FILE" "-f") \
    $( if [[ -n $IMAGE_TAG ]]; then printf "%s" "--set-string image.tag=${IMAGE_TAG}"; fi ) \
    "$CHARTS_DIR/$HELM_CHART_TEMPLATE_NAME/"
