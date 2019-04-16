#! /bin/bash

set -e

REPO=$1
DOCKER_REPOSITORY="commercetools/commercetools-adyen-integration-${REPO}"

cd ./$REPO/
echo "Building Docker image using tag '${DOCKER_REPOSITORY}:${TRAVIS_TAG}'."
docker build -t "${DOCKER_REPOSITORY}:${TRAVIS_TAG}" .

echo "Pushing Docker images to repository '${DOCKER_REPOSITORY}'."
docker push "${DOCKER_REPOSITORY}:${TRAVIS_TAG}"
