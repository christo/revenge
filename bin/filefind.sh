#!/usr/bin/env bash

:
if [ $# -lt 1 ]; then
    echo "Usage: $0 <directory>"
    exit 1
fi

DIRECTORY="$1"
#FILE_TYPE_REGEX='CCS C64 Emultar Cartridge Image'
FILE_TYPE_REGEX='CBM BASIC, '

find "$DIRECTORY" -type f -print0 |
while IFS= read -r -d '' file; do
    file_type=$(file -b "$file")
    if [[ $file_type =~ $FILE_TYPE_REGEX ]]; then
        echo "$file"
    fi
done
