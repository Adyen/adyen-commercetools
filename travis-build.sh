#! /bin/bash

set -e

export REPO=$1
export DOCKER_TAG=`if [ "$TRAVIS_BRANCH" == "master" -a "$TRAVIS_PULL_REQUEST" = "false" ]; then echo "latest"; else echo "wip-${TRAVIS_BRANCH//\//-}" ; fi`

echo "Building Docker image using tag 'commercetools/commercetools-adyen-integration-${REPO}:${COMMIT}'."
cd ./$REPO/
docker build -t "commercetools/commercetools-adyen-integration-${REPO}:${COMMIT}" .

echo "Adding additional tag '${REPO}:${TRAVIS_TAG}' to already built Docker image '${REPO}:${COMMIT}'."
docker tag $REPO:$COMMIT $REPO:${TRAVIS_TAG};
echo "Pushing Docker images to repository '${REPO}' (all local tags are pushed)."
docker push $REPO
