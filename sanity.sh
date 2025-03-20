#!/usr/bin/env bash

# not many requirements but this is expected to grow
# to my mind this is better than a readme

all_good=1
for e in npx node bun; do
  if [[ $(which "$e") ]]; then
    echo checking PATH for $e
  else
    echo missing required executable: $e
    echo "   you should install that"
    all_good=0
  fi
done

for d in server/data server/data/preload; do
  if [[ -d "$d" ]]; then
    echo checking dir $d
  else
    echo missing directory: $d
    echo "   you should create that"
    all_good=0
  fi
done
if [[ $all_good -eq 1 ]]; then
  echo sanity: all good
fi