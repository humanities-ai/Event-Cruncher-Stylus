# Debian Bookworm (Node 22)
FROM node:22-bookworm

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ENV HOST=0.0.0.0
ENV BROWSER=none
ENV WDS_SOCKET_PORT=0

EXPOSE 3000

CMD ["npm", "start"]
