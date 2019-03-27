#! /bin/bash

# re-tag "${PROJECT_NAME}:latest" docker image with new registry and commit hash values,
# and push gcloud docker registry.
# this script expects the gcloud SDK is installed and user is logged in.
# See gcloud-login.sh

set -e
. "$(dirname "$0")/common.sh"

echo "Gcloud Push Image Script"

# verify mandatory values
verifyMandatoryValues GCLOUD_PROJECT_ID PROJECT_NAME DOCKER_TAG REGISTRY_NAME

IMAGE_NAME_LATEST="${PROJECT_NAME}:latest" # local built image name, must already exist
IMAGE_NAME_COMMIT="${PROJECT_NAME}:${DOCKER_TAG}" # image with git tag to push to the registry
FULL_IMAGE_NAME="${REGISTRY_NAME}/${GCLOUD_PROJECT_ID}/${IMAGE_NAME_COMMIT}"

printf "current gcloud account: [%s]" "$(gcloud config get-value account)"

# allow docker client push images to gcloud, \
# "yes" is to allow update local Docker configuration file ~/.docker/config.json
yes | gcloud auth configure-docker

echo "Pushing new docker image [${FULL_IMAGE_NAME}]"
# Push to Google container registry
docker tag "${IMAGE_NAME_LATEST}" "${FULL_IMAGE_NAME}"
docker push -- "${FULL_IMAGE_NAME}"