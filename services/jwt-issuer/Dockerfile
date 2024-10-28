FROM node:18
ARG KMS_WORKSPACE

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Build
COPY . .
RUN npm run build

# Run
CMD ["npm", "start"]