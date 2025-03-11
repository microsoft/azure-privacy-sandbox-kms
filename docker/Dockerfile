ARG CCF_PLATFORM
ARG CCF_VERSION=ccf-6.0.0-rc0

# Build Image ------------------------------------------------------------------

FROM ghcr.io/microsoft/ccf/app/dev/virtual:${CCF_VERSION} AS builder

COPY .devcontainer/install_packages.sh /src/
RUN /src/install_packages.sh

COPY .devcontainer/install_nodejs.sh /src/
ENV NVM_DIR=/kms/.nvm
RUN /src/install_nodejs.sh

COPY .devcontainer/setup_tinkey.sh /src/
ENV TINKEY_VERSION=tinkey-1.10.1
RUN /src/setup_tinkey.sh

# Copy minimal set of files to build KMS bundle to reduce rebuilds
COPY Makefile /kms/Makefile
COPY src /kms/src
COPY scripts /kms/scripts
COPY governance /kms/governance
COPY package.json /kms/package.json
COPY requirements.txt /kms/requirements.txt
RUN echo pandas==2.0.3 >> /kms/requirements.txt
COPY rollup.config.js /kms/rollup.config.js
COPY app.json /kms/app.json
COPY build_bundle.js /kms/build_bundle.js
COPY babel.config.json /kms/babel.config.json
COPY buf.gen.yaml /kms/buf.gen.yaml
COPY loader-register.js /kms/loader-register.js
COPY test /kms/test
COPY tsconfig.json /kms/tsconfig.json

WORKDIR /kms
RUN make build

COPY docker/run_standalone_kms.sh /kms/docker/run_standalone_kms.sh

# Run Image --------------------------------------------------------------------

# While KMS relies on running on sandbox.sh we need to use dev image
# FROM mcr.microsoft.com/ccf/app/run-js/${CCF_PLATFORM}:${CCF_VERSION}
FROM ghcr.io/microsoft/ccf/app/dev/${CCF_PLATFORM}:${CCF_VERSION}

COPY .devcontainer/install_nodejs.sh /src/
RUN NVM_DIR=/root/.nvm /src/install_nodejs.sh

COPY --from=builder /kms /kms
WORKDIR /kms

ARG CCF_PLATFORM
ENV CCF_PLATFORM=${CCF_PLATFORM}
ENV JWT_ISSUER_PORT=3000
CMD /bin/bash -c 'docker/run_standalone_kms.sh'