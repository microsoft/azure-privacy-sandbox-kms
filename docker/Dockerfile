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

RUN npm install && npm run build

# Run Image --------------------------------------------------------------------

FROM mcr.microsoft.com/mirror/docker/library/ubuntu:22.04
WORKDIR /kms

RUN apt-get update && apt-get install -y \
    gettext \
    python3-pip \
    jq \
    curl

# Install nodejs for running the dummy JWT issuer
RUN curl -fsSL https://deb.nodesource.com/setup_current.x | bash - && \
    apt-get install -y nodejs

RUN curl -sL https://aka.ms/InstallAzureCLIDeb | bash

COPY requirements.txt ./
RUN pip install -r requirements.txt

COPY . .
COPY docker/run_standalone_kms.sh /run.sh
COPY --from=builder /kms/dist ./dist

CMD /bin/bash -c '/run.sh'