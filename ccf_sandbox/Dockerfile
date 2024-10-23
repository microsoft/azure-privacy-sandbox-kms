FROM ghcr.io/microsoft/ccf/app/dev/virtual:latest

# Pre install CCF dependencies to speed up container start
SHELL ["/bin/bash", "-c"]
RUN /opt/ccf_virtual/bin/sandbox.sh & until [[ $(curl -k -s -o /dev/null -w "%{http_code}" https://127.0.0.1:8000/node/network) =~ ^(200|400)$ ]]; do sleep 1; done
