ARG CCF_PLATFORM
FROM ghcr.io/microsoft/ccf/app/dev/${CCF_PLATFORM}:ccf-6.0.0-rc0

RUN mkdir -p /kms
WORKDIR /kms

COPY .devcontainer/install_packages.sh /kms/.devcontainer/
RUN .devcontainer/install_packages.sh

COPY .devcontainer/install_nodejs.sh /kms/.devcontainer/
ENV NVM_DIR=/kms/.nvm
RUN .devcontainer/install_nodejs.sh

COPY requirements.txt /kms/
RUN pip install -r requirements.txt

COPY . /kms

RUN rm -rf .venv_ccf_sandbox
ENV JWT_ISSUER_PORT=3000

CMD ./docker/run_kms_standalone.sh; \
    sleep infinity