FROM node:18-alpine3.16
ARG KMS_WORKSPACE

WORKDIR /app

RUN apk update && apk add curl

# Install dependencies
COPY package*.json ./
RUN npm install

# Build
COPY . .
RUN npm run build

# Run
CMD ["npm", "start"]