#! /bin/bash

set -e

export REPO_EXT="commercetools/commercetools-adyen-integration-extension"
export DOCKER_TAG=`if [ "$TRAVIS_BRANCH" == "master" -a "$TRAVIS_PULL_REQUEST" = "false" ]; then echo "latest"; else echo "wip-${TRAVIS_BRANCH//\//-}" ; fi`

echo "Building Docker image for Extension integration using tag '${REPO_EXT}:${COMMIT}'."
cd ./extension/
docker build -t "${REPO_EXT}:${COMMIT}" .

docker login -u="${DOCKER_USERNAME}" -p="${DOCKER_PASSWORD}"
echo "Adding additional tag '${REPO_EXT}:${TRAVIS_TAG}' to already built Docker image '${REPO_EXT}:${COMMIT}'."
docker tag $REPO_EXT:$COMMIT $REPO_EXT:${TRAVIS_TAG};
echo "Pushing Docker images to repository '${REPO_EXT}' (all local tags are pushed)."
docker push $REPO_EXT
docker logout
