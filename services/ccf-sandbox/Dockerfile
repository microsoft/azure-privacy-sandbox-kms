ARG CCF_PLATFORM
ARG CCF_VERSION=ccf-5.0.11
FROM ghcr.io/microsoft/ccf/app/dev/${CCF_PLATFORM}:${CCF_VERSION}}

# Pre install CCF dependencies to speed up container start (only works in virtual mode)
ARG CCF_PLATFORM
SHELL ["/bin/bash", "-c"]
RUN apt-get install -y uuid-runtime gettext

# Prebuild python venv to speed up start time
RUN python3 -m venv .venv_ccf_sandbox && \
    . .venv_ccf_sandbox/bin/activate && \
    pip install -U -q pip && \
    VERSION=$(sed 's/^ccf-//' "/opt/ccf_${CCF_PLATFORM}/share/VERSION_LONG") && \
    pip install -q -U "ccf==$VERSION" && \
    pip install -q -U -r "/opt/ccf_${CCF_PLATFORM}/bin/requirements.txt"
