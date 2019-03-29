#!/bin/bash
set -e

declare -a ACTIONS=("encrypt" "decrypt")
declare -a ENVIRONMENTS=("demo")
# Google Cloud project
PROJECT_NAME="ctp-adyen-integration"
GCLOUD_PROJECT_ID="professionalserviceslabs"
SELECTED_APPLICATION="ctp-adyen-integration-notification"

# Checks if the element exists in the array
# Usage: containsElement "${array[@]}" "blabla"
function containsElement() {
    local n=$#
    local value=${!n}
    for ((i=1;i < $#;i++)) {
        if [ "${!i}" == "${value}" ]; then
            return 0
        fi
    }
    return 1
}

requireEnvironment(){
    printf "Available environments:\n"
    for i in "${!ENVIRONMENTS[@]}" ; do
        printf "> %s. %s\n" "$(($i+1))" "${ENVIRONMENTS[$i]}"
    done
    read -p "Enter the environment number: " SELECTED_ENVIRONMENT_INDEX
    printf "\n"
    # If the entered environment number is out of `ENVIRONMENTS` then exit
    if ! [ "$SELECTED_ENVIRONMENT_INDEX" -ge 1 -a "$SELECTED_ENVIRONMENT_INDEX" -le ${#ENVIRONMENTS[@]} ]; then
        printf "Wrong environment number. Exiting with 1.\n"
        exit 1
    fi
    # Workaround for return. Returns function parameter by reference
    eval "$1='${ENVIRONMENTS[$(($SELECTED_ENVIRONMENT_INDEX-1))]}'"
}

requireAction(){
    printf "Available actions:\n"
    for i in "${!ACTIONS[@]}" ; do
        printf "> %s. %s\n" "$(($i+1))" "${ACTIONS[$i]}"
    done
    read -p "Enter the action number: " SELECTED_ACTION_INDEX
    printf "\n"
    # If the entered action number is out of `ACTIONS` then exit
    if ! [ "$SELECTED_ACTION_INDEX" -ge 1 -a "$SELECTED_ACTION_INDEX" -le ${#ACTIONS[@]} ]; then
        printf "Wrong action number. Exiting with 1.\n"
        exit 1
    fi
    # Workaround for return. Returns function parameter by reference
    eval "$1='${ACTIONS[$((SELECTED_ACTION_INDEX-1))]}'"
}

includeScriptOrDie() {
    COMMON_SCRIPT="$(dirname "$0")/$1"
    if [ ! -r "$COMMON_SCRIPT" ] ; then
        echo "Error: script [${COMMON_SCRIPT}] not found!"
        exit 1
    fi
    . "$COMMON_SCRIPT"
}

# This function ensures that all necessary arguments are passed to the script.
# If no arguments passed - it asks all of them
# If only 1 argument passed - it asks for other 2
# and so on.
# It also validates all passed arguments and returns in case of invalid one.
requireArguments() {
    local ACTION_VALIDATION_ERROR_MESSAGE="Provided action is invalid."
    local ENVIRONMENT_VALIDATION_ERROR_MESSAGE="Provided environment is invalid."
    case "$#" in
        "0")
            requireAction SELECTED_ACTION
            requireEnvironment SELECTED_ENVIRONMENT
            requestApproval
            ;;
        "1")
            if validateInput $1 "${ACTION_VALIDATION_ERROR_MESSAGE}" ACTIONS[@]; then
                SELECTED_ACTION=$1;
            else return 1
            fi
            # requireApplication SELECTED_APPLICATION
            requireEnvironment SELECTED_ENVIRONMENT
            requestApproval
            ;;
        *)
            if validateInput $1 "${ACTION_VALIDATION_ERROR_MESSAGE}" ACTIONS[@] && \
            # validateInput $2 "${APPLICATION_NAME_VALIDATION_ERROR_MESSAGE}" APPLICATION_NAMES[@] && \
            validateInput $2 "${ENVIRONMENT_VALIDATION_ERROR_MESSAGE}" ENVIRONMENTS[@] ; then
                SELECTED_ACTION=$1
                # SELECTED_APPLICATION=$2
                SELECTED_ENVIRONMENT=$2
            else return 1
            fi
            ;;
    esac
}

startEncrypt() {
    includeScriptOrDie "encrypt.sh"
    local ENCRYPTED_FILE=''
    encrypt ENCRYPTED_FILE \
      && printf "Encrypted successfully:\n" \
      && ls -l ${ENCRYPTED_FILE} \
      && printf "Don't forget to add/commit the encrypted file\n"
}

startDecrypt() {
    local DECRYPTED_FILE=''
    includeScriptOrDie "decrypt.sh"
    decrypt DECRYPTED_FILE \
      && printf "\nDecrypted successfully:\n" \
      && ls -l ${DECRYPTED_FILE}
}

requestApproval() {
    while true; do
        read -p "Going to execute`echo $'\n> '`${bold}${SELECTED_ACTION} ${SELECTED_APPLICATION} ${SELECTED_ENVIRONMENT} (y/n)${normal} " yn
        case ${yn} in
            [Yy]* ) echo "Starting to ${SELECTED_ACTION}..."; break;;
            [Nn]* ) echo "Terminating process"; exit;;
            * ) echo "Please answer yes or no.";;
        esac
    done
}

main() {
    local bold=$(tput bold)
    local normal=$(tput sgr0)
    requireArguments $@ || return 1

    if [ "${SELECTED_ACTION}" = "encrypt" ] ; then
        startEncrypt
    else
        startDecrypt
    fi
}

validateInput() {
    if ! containsElement ${!3} "$1"; then
        printf "$2\n"
        return 1
    fi
}

if ! main $@; then exit 1; fi
