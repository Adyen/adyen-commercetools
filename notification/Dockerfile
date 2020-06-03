FROM node:12.18.0-alpine
MAINTAINER Professional Services <ps-dev@commercetools.de>

WORKDIR /app

RUN apk --update add make python

RUN apk --update add git

COPY . /app

RUN npm ci --only=prod
ENTRYPOINT ["npm", "run", "start"]
