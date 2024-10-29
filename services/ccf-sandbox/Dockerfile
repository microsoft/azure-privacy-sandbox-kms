ARG CCF_PLATFORM
FROM ghcr.io/microsoft/ccf/app/dev/${CCF_PLATFORM}:latest

# Pre install CCF dependencies to speed up container start (only works in virtual mode)
ARG CCF_PLATFORM
SHELL ["/bin/bash", "-c"]
RUN (ls /opt/ccf_virtual/bin/sandbox.sh && (/opt/ccf_virtual/bin/sandbox.sh & until [[ $(curl -k -s -o /dev/null -w "%{http_code}" https://127.0.0.1:8000/node/network) =~ ^(200|400)$ ]]; do sleep 1; done)) || true
