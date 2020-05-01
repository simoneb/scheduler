FROM node:14.01-alpine

ENV NODE_ENV=production

WORKDIR /var/www

COPY ./package*.json ./

RUN npm ci

COPY ./build ./

CMD ["node", "src/main.js"]
