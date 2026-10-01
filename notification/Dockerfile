# Pinned by digest (multi-arch index of node:24-alpine); Renovate keeps the digest current.
FROM node:24-alpine@sha256:ebfe2f90462722a7a4de65e91990e97fe0d401c70e0e762c5b53302f905ec1c1
LABEL org.opencontainers.image.authors="Professional Services <ps-dev@commercetools.com>"

WORKDIR /app

COPY . /app

# Install production dependencies only, then drop the package managers from the runtime image:
# the service is started with plain `node` and never needs npm/yarn at runtime, and the npm
# bundled in the base image carries its own vulnerable transitive packages.
RUN npm ci --omit=dev --ignore-scripts \
 && npm cache clean --force \
 && rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx \
           /opt/yarn-* /usr/local/bin/yarn /usr/local/bin/yarnpkg /root/.npm
CMD [ "node", "src/init.js" ]
