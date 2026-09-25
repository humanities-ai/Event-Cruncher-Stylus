# Debian Bookworm (Node 22)
FROM node:22-bookworm

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .

EXPOSE 4000

CMD ["npm", "start"]
