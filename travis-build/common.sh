#! /bin/bash

# common build scripts

# verify that all the passed arguments exist as environment variable
verifyMandatoryValues() {
    for envVariable in $* ; do
      : "${!envVariable?Required env variable $envVariable}"
    done
}


# This function checks if the file in the first argument $1 exists and is readable.
# If yes, then it prints the option supplied in the second argument $2 before the file path.
#
# Example:
#
# Given: $1="filename" | $2="-f" | the file with the path "filename" exists and is readable.
# Output: this function would print "-f filename"
execOptionIfFileExistsAndIsReadable() {
    if [ -r "$1" ]; then printf "%s %s" "$2" "$1"; fi
}