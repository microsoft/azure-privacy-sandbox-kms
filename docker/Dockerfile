ARG CCF_PLATFORM
ARG CCF_VERSION=5.0.0-dev10

# Build Image ------------------------------------------------------------------

FROM mcr.microsoft.com/ccf/app/dev:${CCF_VERSION}-${CCF_PLATFORM} AS builder
ARG CCF_PLATFORM

COPY .devcontainer/install_packages.sh /src/
RUN /src/install_packages.sh

COPY .devcontainer/install_nodejs.sh /src/
ENV NVM_DIR /kms/.nvm
RUN /src/install_nodejs.sh

# Copy minimal set of files to build KMS bundle to reduce rebuilds
COPY Makefile /kms/Makefile
COPY src /kms/src
COPY scripts /kms/scripts
COPY governance /kms/governance
COPY package.json /kms/package.json
COPY requirements.txt /kms/requirements.txt
COPY rollup.config.js /kms/rollup.config.js
COPY app.json /kms/app.json
COPY build_bundle.js /kms/build_bundle.js
COPY tsconfig.json /kms/tsconfig.json

WORKDIR /kms
RUN make build

# Needed because the code to run a dummy idp is in test/utils/jwt
COPY test /kms/test

# Run Image --------------------------------------------------------------------

# While KMS relies on running on sandbox.sh we need to use dev image
# FROM mcr.microsoft.com/ccf/app/run-js:${CCF_VERSION}-${CCF_PLATFORM}
FROM mcr.microsoft.com/ccf/app/dev:${CCF_VERSION}-${CCF_PLATFORM}
ARG CCF_PLATFORM

RUN apt-get update && apt-get install -y lsof

COPY --from=builder /kms /kms

# Install Node to run IDP (Currently bundled to KMS but should be separated)
ENV CCF_PLATFORM=${CCF_PLATFORM} PATH=/kms/.nvm/versions/node/v22.5.1/bin/:$PATH
CMD ["/bin/bash", "-c", "cd /kms && (make start-host-idp & (./scripts/kms_wait.sh && make setup && tail -f /dev/null))"]
