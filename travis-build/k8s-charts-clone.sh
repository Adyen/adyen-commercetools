#! /bin/bash

set -e

CHARTS_DIR="$1"
SCRIPT_DIR="$(dirname "$0")"

printf "\n- Verifying mandatory envs: [HELM_CHARTS_REPO, HELM_CHARTS_VERSION, CHARTS_DIR]..\n"
. "${SCRIPT_DIR}/common.sh"
verifyMandatoryValues HELM_CHARTS_REPO HELM_CHARTS_VERSION CHARTS_DIR

printf "\n- Cloning commercetools/k8s-charts repo..\n"
git clone --branch="$HELM_CHARTS_VERSION" --depth=1 "$HELM_CHARTS_REPO" "$CHARTS_DIR"/