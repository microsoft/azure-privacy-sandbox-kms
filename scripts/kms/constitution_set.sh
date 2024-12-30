#!/bin/bash

# Copyright (c) Microsoft Corporation.
# Licensed under the MIT license.

constitution-set() {
  set -e

  REPO_ROOT="$(realpath "$(dirname "$(realpath "${BASH_SOURCE[0]}")")/../..")"
  BASE_DIR=$REPO_ROOT/governance/constitution
  OUTPUT="$WORKSPACE/proposals/constitution.js"
  declare -A constitution_files=(
    [actions]="$BASE_DIR/actions/default.js"
    [apply]="$BASE_DIR/apply/default.js"
    [resolve]="$BASE_DIR/resolve/majority_vote.js"
    [validate]="$BASE_DIR/validate/default.js"
  )

  while [[ $# -gt 0 ]]; do
      case "$1" in
        --actions)
            constitution_files["actions"]="${constitution_files["actions"]},$(realpath $2)"
            shift 2
            ;;
        --apply)
            constitution_files["apply"]="$(realpath $2)"
            shift 2
            ;;
        --resolve)
            constitution_files["resolve"]="$(realpath $2)"
            shift 2
            ;;
        --validate)
            constitution_files["validate"]="$(realpath $2)"
            shift 2
            ;;
        *)
            echo "Unknown option: $key"
            return 1
            ;;
      esac
  done

  rm -f $OUTPUT || true
  mkdir -p $WORKSPACE/proposals
  touch $OUTPUT
  for key in "${!constitution_files[@]}"; do
    files=${constitution_files[$key]}
    IFS=',' read -r -a file_array <<< "$files"
    for f in "${file_array[@]}"; do
      echo "Using file: $(realpath --relative-to="$PWD" "$f")"
      cat $f >> $OUTPUT
    done
  done
  echo "Final constitution: $OUTPUT"

  # Construct the proposal
  jq --arg constitution "$(tr -s ' ' < "$WORKSPACE/proposals/constitution.js")" \
    '.actions[0].args.constitution = $constitution' \
      $REPO_ROOT/governance/proposals/set_constitution.json > $WORKSPACE/proposals/set_constitution.json

  # Submit the proposal
  source $REPO_ROOT/scripts/ccf/propose.sh
  ccf-propose $WORKSPACE/proposals/set_constitution.json

  set +e
}

constitution-set "$@"
