# Dockerfile used to build an image to start the hardhat network
FROM node:16-alpine3.15

RUN npm install -g pnpm
RUN pnpm config set auto-install-peers true

RUN apk --no-cache add curl git
RUN apk add --no-cache --virtual .gyp python3 make g++
# See: https://github.com/vercel/turbo/issues/2198#issuecomment-1276475618
RUN apk add --no-cache libc6-compat

WORKDIR /app

COPY package.json .npmrc ./
COPY src ./src

RUN pnpm install

CMD npx hardhat --config ./src/hardhat.config.ts node
