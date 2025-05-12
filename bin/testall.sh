#!/usr/bin/env bash

# tests both client and server modules for compile, build and automated tests
# no checkin should fail this

PROJECT_DIR=$(dirname "$0")/..

MODULE="$PROJECT_DIR/server"
bun --cwd="$MODULE" run compile && bun --cwd="$MODULE" test && bun --cwd="$MODULE" run lint
MODULE="$PROJECT_DIR/client"
bun --cwd="$MODULE" run compile && bun --cwd="$MODULE" test && bun --cwd="$MODULE" run build && bun --cwd="$MODULE" run lint
