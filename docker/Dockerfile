FROM mcr.microsoft.com/devcontainers/universal:2

RUN pip install ccf

# Setup docker in docker
RUN curl -fsSL https://raw.githubusercontent.com/devcontainers/features/refs/heads/main/src/docker-in-docker/install.sh | bash

COPY . /kms
WORKDIR /kms
CMD /bin/bash -c "\
  docker compose -f services/docker-compose.yml logs -f & \
  . scripts/ccf/sandbox_local/up.sh && \
  . scripts/kms/js_app_set.sh && \
  ./scripts/kms/constitution_set.sh \
		--resolve ./governance/constitution/resolve/auto_accept.js \
		--actions ./governance/constitution/actions/kms.js && \
  . scripts/jwt_issuer/up.sh && \
  ./scripts/kms/endpoints/refresh.sh && \
  tail -f workspace/sandbox_0/out"