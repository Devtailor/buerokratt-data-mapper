# Build image
FROM node:20.16-alpine AS build
WORKDIR /workspace/app/
EXPOSE 3000

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

RUN apk add --no-cache chromium
COPY package*.json .
RUN npm ci --ignore-scripts

# Run image
FROM build AS run
USER node
COPY controllers controllers
COPY views views
COPY lib lib
COPY js js
COPY server.js ./
ENTRYPOINT ["npm", "start"]
