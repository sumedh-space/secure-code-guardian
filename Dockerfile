FROM node:18-alpine

WORKDIR /app

COPY backend/package*.json ./

RUN npm install --production

COPY backend/ .

EXPOSE 5000

ENV NODE_ENV=production

CMD ["node", "server.js"]
