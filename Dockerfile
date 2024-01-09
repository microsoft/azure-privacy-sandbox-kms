FROM mcr.microsoft.com/ccf/app/dev:4.0.7-virtual as builder

# Install build dependencies
RUN apt install curl npm -y
RUN npm install -g npm@6.14.13
RUN curl -sL https://deb.nodesource.com/setup_20.x | bash -
RUN apt-get install -y nodejs

# Add optional utitlities
RUN apt install iputils-ping net-tools curl tree nano -y

# Add and build kms.
WORKDIR /app
COPY . .

RUN npm install
RUN npm run build

# keep container running
#CMD ["tail", "-f", "/dev/null"]
