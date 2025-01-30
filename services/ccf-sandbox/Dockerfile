ARG CCF_PLATFORM
FROM ghcr.io/microsoft/ccf/app/dev/${CCF_PLATFORM}:ccf-5.0.11

# Pre install CCF dependencies to speed up container start (only works in virtual mode)
ARG CCF_PLATFORM
SHELL ["/bin/bash", "-c"]
RUN apt-get install -y uuid-runtime gettext
RUN (ls /opt/ccf_virtual/bin/sandbox.sh && (/opt/ccf_virtual/bin/sandbox.sh & until [[ $(curl -k -s -o /dev/null -w "%{http_code}" https://127.0.0.1:8000/node/network) =~ ^(200|400)$ ]]; do sleep 1; done)) || true
