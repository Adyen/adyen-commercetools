#!/bin/bash
set -e

KEYRING="${PROJECT_NAME}-keyring-${SELECTED_ENVIRONMENT}"
KEY="${SELECTED_APPLICATION}-key-${SELECTED_ENVIRONMENT}"

ENC_EXT=".enc"
SECRETS_NAME="secrets.yaml"
DIR="$( cd "$( dirname "$0" )" && pwd )"
DECRYPTED_FILE="${DIR}/../${SELECTED_ENVIRONMENT}/${SECRETS_NAME}"

encrypt() {
    if [ ! -f ${DECRYPTED_FILE} ]; then
        printf "Secret file not found!\n"
        return 1
    fi

    gcloud kms encrypt \
      --project="${GCLOUD_PROJECT_ID}"\
      --location="global" \
      --keyring="$KEYRING" \
      --key="$KEY" \
      --plaintext-file="${DECRYPTED_FILE}" \
      --ciphertext-file="${DECRYPTED_FILE}${ENC_EXT}"
    # Workaround for return. Returns function parameter by reference
    eval "$1='${DECRYPTED_FILE}${ENC_EXT}'"
}