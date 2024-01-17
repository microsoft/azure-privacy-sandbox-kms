# Fake attestation for testing in non-SNP environment

snp.json is made by `//scp/cc/azure/attestation:print_snp_json` in data-plane-shared-libraries.
You need to re-run it when snp.json is expired.

```bash
cd data-plane-shared-libraries
# Just run it locally. It prints a fake report if it's in SNP environment.
bazel run //scp/cc/azure/attestation:print_snp_json

# --- example output ---
# report (fake=0):
# <contents of snp.json>

# Build print_snp_json with static link
# The output path is `bazel-bin/scp/cc/azure/attestation/print_snp_json``
bazel build //scp/cc/azure/attestation:print_snp_json
```

Also you need to update the fake attestation in `data-plane-shared-libraries/scp/cc/azure/attestation/json_attestation_report.cc``
