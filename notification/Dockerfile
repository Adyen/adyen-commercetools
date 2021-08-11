FROM node:16.6.1-alpine
MAINTAINER Professional Services <ps-dev@commercetools.com>

WORKDIR /app

RUN apk --update add make python

RUN apk --update add git

COPY . /app

RUN npm ci --only=prod
CMD [ "node", "src/init.js" ]
