# Build
FROM node:20.19.3-alpine AS build
WORKDIR /workspace/app/
EXPOSE 3000

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

RUN apk add --no-cache chromium curl bash

COPY package.json package-lock.json ./

# Uncomment this when you run npm install locally
#RUN npm ci --ignore-scripts
RUN npm install --ignore-scripts 

COPY . .

RUN npm run build

# Runtime
FROM node:20.19.3-alpine AS run
WORKDIR /workspace/app/
USER node
EXPOSE 3000

COPY --from=build --chown=node:node /workspace/app/dist ./
COPY --from=build --chown=node:node /workspace/app/package.json ./
COPY --from=build --chown=node:node /workspace/app/node_modules ./node_modules
COPY --from=build --chown=node:node /workspace/app/.env ./
COPY --from=build --chown=node:node /workspace/app/sync.sh ./

ENTRYPOINT ["npm", "start"]
