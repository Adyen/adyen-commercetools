#!/bin/bash
set -e

KEYRING="${PROJECT_NAME}-keyring-${SELECTED_ENVIRONMENT}"
KEY="${SELECTED_APPLICATION}-key-${SELECTED_ENVIRONMENT}"

ENC_EXT=".enc"
SECRETS_NAME="secrets.yaml"
DIR="$( cd "$( dirname "$0" )" && pwd )"
DECRYPTED_FILE="${DIR}/../${SELECTED_ENVIRONMENT}/${SECRETS_NAME}"
ENCRYPTED_FILE="${DECRYPTED_FILE}${ENC_EXT}"

decrypt() {
    if [ ! -f ${ENCRYPTED_FILE} ]; then
        printf "Encrypted secret file not found!\n"
        return 1
    fi

    gcloud kms decrypt \
      --project="${GCLOUD_PROJECT_ID}"\
      --location="global" \
      --keyring="$KEYRING" \
      --key="$KEY" \
      --plaintext-file="${DECRYPTED_FILE}" \
      --ciphertext-file="${ENCRYPTED_FILE}"
    # Workaround for return. Returns function parameter by reference
    eval "$1='${DECRYPTED_FILE}'"
}