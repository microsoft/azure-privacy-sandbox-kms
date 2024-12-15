ARG CCF_PLATFORM
ARG CCF_VERSION=ccf-5.0.8
FROM ghcr.io/microsoft/ccf/app/dev/${CCF_PLATFORM}:${CCF_VERSION}

COPY .devcontainer/install_nodejs.sh /src/
RUN NVM_DIR=/root/.nvm /src/install_nodejs.sh

RUN apt-get update && apt-get install -y ca-certificates curl gnupg lsb-release docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin gettext python3-pip
RUN curl -fsSL https://raw.githubusercontent.com/devcontainers/features/refs/heads/main/src/docker-in-docker/install.sh | bash

RUN pip install ccf

COPY . /kms
WORKDIR /kms

ARG CCF_PLATFORM
ENV CCF_PLATFORM=${CCF_PLATFORM}
CMD ["/bin/bash", "-c", "sudo dockerd > /dev/null 2>&1 & make start-host-idp & (./scripts/kms_wait.sh && make setup && tail -f /kms/workspace/sandbox_0/out)"]
