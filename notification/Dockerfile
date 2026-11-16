# Pinned by digest (multi-arch index of node:24-alpine); Renovate keeps the digest current.
FROM node:26-alpine@sha256:6bd9ab43c0ec0190ca7b2d193906cb8b7edf6e7f4afa43ddeccd6452710bffb5
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
