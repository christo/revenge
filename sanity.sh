#!/usr/bin/env bash

# basic script to check development environment, only a few requirements
# to my mind this is better than a readme (which also exists)

all_good=1 # unless proven guilty

RED_CROSS="❌"
GREEN_CHECK="✔️"

function success() {
  echo -e "\033[92m${GREEN_CHECK} ${*}\033[0m"
}

function fail() {
  echo -e "\033[91m${RED_CROSS} ${*}\033[0m"
  all_good=0
}

# you're going to need these for some build targets
for e in npx node bun; do
  if [[ $(which "$e") ]]; then
    success found on PATH: $e
  else
    fail install missing required executable: $e
  fi
done

# we assume these dirs exist
for d in server/data server/data/preload server/data/preload/c64 server/data/preload/vic20; do
  if [[ -d "$d" ]]; then
    success found dir $d
  else
    fail create missing directory: $d
  fi
done


if [[ -e "server/.env" ]]; then
  success checking .env file exists
else
  fail "server/.env file does not exist \n\
    copy the template server/example.env to server/.env and edit to taste"
fi

if [[ $all_good -eq 1 ]]; then
  echo
  success sanity: all good
else
  exit 1
fi