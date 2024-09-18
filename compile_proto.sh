
PROTOC_GEN_TS_PATH="/root/.nvm/versions/node/v22.7.0/bin/protoc-gen-ts"
# Directory to write generated code to (.js and .d.ts files)
OUT_DIR="./generated"

protoc \
    --plugin="protoc-gen-ts=${PROTOC_GEN_TS_PATH}" \
    --es6_out="import_style=commonjs,binary:${OUT_DIR}" \
    --ts_out="${OUT_DIR}" \
    src/endpoints/proto/hpke.proto src/endpoints/proto/tink.proto