FROM node:16-alpine3.14
MAINTAINER Professional Services <ps-dev@commercetools.com>

WORKDIR /app

COPY . /app

RUN npm ci --only=prod
CMD [ "node", "src/init.js" ]
