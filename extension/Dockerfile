FROM mhart/alpine-node:8
MAINTAINER Professional Services <ps-dev@commercetools.de>

WORKDIR /app

RUN apk --update add make python

RUN apk --update add git

COPY . /app

RUN npm ci --only=prod
ENTRYPOINT ["npm", "run", "start"]