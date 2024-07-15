#!/bin/bash

# Copyright (c) Microsoft Corporation.
# Licensed under the MIT license.
set -euo pipefail

# This script generate the proposal for jwt issuer policy for AAD

function usage {
    echo ""
    echo "Generate the set_jwt_issuer proposal with the latest ca bundle."
    echo ""
    echo "usage: ./generate_jwt_proposal_payload.sh --proposal-file string"
    echo ""
    echo "  --proposal-file         string      path where to store the proposal file"
    echo ""
    exit 0
}

# Parse arguments

while [ $# -gt 0 ]
do
    name="${1/--/}"
    name="${name/-/_}"
    case "--$name"  in
        --proposal_file) proposal_file="$2"; shift;;
        --help) usage; exit 0; shift;;
        --) shift;;
    esac
    shift;
done
echo $proposal_file


output=$(python3 $(pwd)/scripts/get_ca_bundle.py)
if [[ -n "$output" ]]; then
    cert_bundle=$(echo "$output" | awk 'NF {sub(/\r/, ""); printf "%s\n",$0;}')
else
    echo "Python script didn't output anything"
    exit 1
fi


proposal='{
  "actions": [
    {
      "name": "set_ca_cert_bundle",
      "args": {
        "name": "jwt_ms",
        "cert_bundle": "-----BEGIN CERTIFICATE-----\nMIIDrzCCApegAwIBAgIQCDvgVpBCRrGhdWrJWZHHSjANBgkqhkiG9w0BAQUFADBh\nMQswCQYDVQQGEwJVUzEVMBMGA1UEChMMRGlnaUNlcnQgSW5jMRkwFwYDVQQLExB3\nd3cuZGlnaWNlcnQuY29tMSAwHgYDVQQDExdEaWdpQ2VydCBHbG9iYWwgUm9vdCBD\nQTAeFw0wNjExMTAwMDAwMDBaFw0zMTExMTAwMDAwMDBaMGExCzAJBgNVBAYTAlVT\nMRUwEwYDVQQKEwxEaWdpQ2VydCBJbmMxGTAXBgNVBAsTEHd3dy5kaWdpY2VydC5j\nb20xIDAeBgNVBAMTF0RpZ2lDZXJ0IEdsb2JhbCBSb290IENBMIIBIjANBgkqhkiG\n9w0BAQEFAAOCAQ8AMIIBCgKCAQEA4jvhEXLeqKTTo1eqUKKPC3eQyaKl7hLOllsB\nCSDMAZOnTjC3U/dDxGkAV53ijSLdhwZAAIEJzs4bg7/fzTtxRuLWZscFs3YnFo97\nnh6Vfe63SKMI2tavegw5BmV/Sl0fvBf4q77uKNd0f3p4mVmFaG5cIzJLv07A6Fpt\n43C/dxC//AH2hdmoRBBYMql1GNXRor5H4idq9Joz+EkIYIvUX7Q6hL+hqkpMfT7P\nT19sdl6gSzeRntwi5m3OFBqOasv+zbMUZBfHWymeMr/y7vrTC0LUq7dBMtoM1O/4\ngdW7jVg/tRvoSSiicNoxBN33shbyTApOB6jtSj1etX+jkMOvJwIDAQABo2MwYTAO\nBgNVHQ8BAf8EBAMCAYYwDwYDVR0TAQH/BAUwAwEB/zAdBgNVHQ4EFgQUA95QNVbR\nTLtm8KPiGxvDl7I90VUwHwYDVR0jBBgwFoAUA95QNVbRTLtm8KPiGxvDl7I90VUw\nDQYJKoZIhvcNAQEFBQADggEBAMucN6pIExIK+t1EnE9SsPTfrgT1eXkIoyQY/Esr\nhMAtudXH/vTBH1jLuG2cenTnmCmrEbXjcKChzUyImZOMkXDiqw8cvpOp/2PV5Adg\n06O/nVsJ8dWO41P0jmP6P6fbtGbfYmbW0W5BjfIttep3Sp+dWOIrWcBAI+0tKIJF\nPnlUkiaY4IBIqDfv8NZ5YBberOgOzW6sRBc4L0na4UU+Krk2U886UAb3LujEV0ls\nYSEY1QSteDwsOoBrp+uvFRTp2InBuThs4pFsiv9kuXclVzDAGySj4dzp30d8tbQk\nCAUw7C29C79Fv1C5qfPrmAESrciIxpg0X40KPMbp1ZWVbd4=\n-----END CERTIFICATE-----\n"
      }
    },
    {
      "name": "set_jwt_issuer",
      "args": {
        "issuer": "https://sts.windows.net/72f988bf-86f1-41af-91ab-2d7cd011db47/",
        "key_filter": "all",
        "ca_cert_bundle_name": "jwt_ms",
        "auto_refresh": true
      }
    },
    {
      "name": "set_jwt_validation_policy",
      "args": {
        "issuer": "https://sts.windows.net/72f988bf-86f1-41af-91ab-2d7cd011db47/",
        "validation_policy": {
          "iss": "https://sts.windows.net/72f988bf-86f1-41af-91ab-2d7cd011db47/",
          "aud": "https://management.azure.com/",
          "appid": "6b505410-70b8-46b6-a840-4403122e2a40",
          "appidacr": "2",
          "idp": "https://sts.windows.net/72f988bf-86f1-41af-91ab-2d7cd011db47/",
          "idtyp": "app",
          "oid": "049a48cd-7652-4159-82cf-7a2a42248b38",
          "sub": "049a48cd-7652-4159-82cf-7a2a42248b38",
          "tid": "72f988bf-86f1-41af-91ab-2d7cd011db47",
          "ver": "1.0",
          "xms_mirid": "/subscriptions/85c61f94-8912-4e82-900e-6ab44de9bdf8/resourcegroups/privacy-sandbox-dev/providers/Microsoft.ManagedIdentity/userAssignedIdentities/privacysandbox"
        }
      }
    }
  ]
}'

new_proposal=$(echo "$proposal" | jq --arg cert_bundle "$cert_bundle" '.actions[0].args.cert_bundle = $cert_bundle')
#echo $new_proposal

# Save new_proposal to the file
echo $new_proposal > $proposal_file
