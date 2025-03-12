ARG CCF_PLATFORM
ARG CCF_VERSION=ccf-6.0.0-rc0

# Build Image ------------------------------------------------------------------

FROM node:lts AS builder

WORKDIR /kms

COPY src ./src
COPY test ./test
COPY package.json .
COPY tsconfig.json .
COPY app.json .
COPY rollup.config.js .
COPY build_bundle.js .
COPY babel.config.json .
COPY buf.gen.yaml .

RUN npm install && npm run build

# Run Image --------------------------------------------------------------------

# While KMS relies on running on sandbox.sh we need to use dev image
# FROM mcr.microsoft.com/ccf/app/run-js/${CCF_PLATFORM}:${CCF_VERSION}
FROM ghcr.io/microsoft/ccf/app/dev/${CCF_PLATFORM}:${CCF_VERSION}
WORKDIR /kms

# Install nodejs for running the dummy JWT issuer
RUN curl -fsSL https://deb.nodesource.com/setup_current.x | bash - && \
    apt-get install -y nodejs

COPY Makefile .
COPY scripts ./scripts
COPY src ./src
COPY governance ./governance
COPY test ./test
COPY docker/run_standalone_kms.sh ./run_standalone_kms.sh
COPY --from=builder /kms/dist ./dist

ARG CCF_PLATFORM
ENV CCF_PLATFORM=${CCF_PLATFORM}
ENV JWT_ISSUER_PORT=3000
CMD /bin/bash -c './run_standalone_kms.sh'