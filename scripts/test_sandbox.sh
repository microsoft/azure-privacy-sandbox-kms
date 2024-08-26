#!/bin/bash

# Copyright (c) Microsoft Corporation.
# Licensed under the MIT license.
set -euo pipefail

declare app_dir=$PWD                   # application folder for reference
declare nodeAddress=""
declare certificate_dir=""
declare constitution_dir=""
declare interactive=0

function usage {
    echo ""
    echo "Start a CCF node in docker."
    echo ""
    echo "usage: ./test_docker.sh --nodeAddress <IPADDRESS:PORT> --certificate_dir <string> --constitution_dir <string> [--interactive]]"
    echo ""
    echo "  --nodeAddress       string      The IP and port of the primary CCF node"
    echo "  --certificate_dir   string      The directory where the certificates are"
    echo "  --constitution_dir  string      The directory where the constitution is"
    echo "  --interactive       boolean     Optional. Run in Demo mode"
    echo ""
}

function failed {
    printf "💥 Script failed: %s\n\n" "$1"
    exit 1
}

# Parse parameters

if [ $# -gt 7 ]; then
    usage
    exit 1
fi

while [ $# -gt 0 ]
do
    name="${1/--/}"
    name="${name/-/_}"
    case "--$name" in
        --nodeAddress) nodeAddress="$2"; shift;;
        --certificate_dir) certificate_dir=$2; shift;;
        --constitution) constitution=$2; shift;;
        --interactive) interactive=1;;
        --help) usage; exit 0;;
        --) shift;;
    esac
    shift;
done

echo "Node address: $nodeAddress"
echo "Certificate dir: $certificate_dir"

# Validate parameters
if [ -z "$nodeAddress" ]; then
    failed "You must supply --nodeAddress"
fi
if [ -z "$certificate_dir" ]; then
    failed "You must supply --certificate_dir"
fi
if [ -z "$constitution" ]; then
    failed "You must supply --constitution"
fi
if [ ! -f "$constitution" ]; then
    echo "💥📁 Constitution file not found: $constitution"
    exit 1
fi

source .venv_ccf_sandbox/bin/activate
echo "💤 Waiting for sandbox in ${app_dir} . . .)"
./scripts/kms_wait.sh
echo "▶️ sandbox is running"

function finish {
  local exit_status=$?
  local last_command=${BASH_COMMAND}

  if [ $interactive -eq 1 ]; then
    echo "🤔 Do you want to stop the sandbox? (Y/n)"
    read -r proceed
    if [ "$proceed" == "n" ]; then
      echo "👍 Sandbox will continue to run."
      exit 0
    fi
  fi

  if [ $exit_status -ne 0 ]; then
    echo "💀 Stopped sandbox process due to an error"
    echo "💥 Error details:"
    echo "  Exit Status  : $exit_status"
    echo "  Last Command : $last_command"
    echo "  Error Output : $(tail -n 10 sandbox_process.log 2>/dev/null || echo 'No log available')"
  else
    echo "💀 Stopped sandbox process"
  fi

  exit $exit_status
}
trap finish EXIT

testScript="$app_dir/test/test.sh"
if [ ! -f "$testScript" ]; then
    echo "💥📂 Test file $testScript not found."
    exit 1
fi

# Build testScript command
testScript="${testScript} --nodeAddress ${nodeAddress} --certificate_dir ${certificate_dir}"
if [ $interactive -eq 1 ]; then
    testScript="${testScript} --interactive"
fi

# Run the testScript command and log the output
${testScript} 2>&1

# Check if ${testScript} failed
if [ $? -ne 0 ]; then
  echo "${testScript} failed"
  exit 1
fi

exit 0
