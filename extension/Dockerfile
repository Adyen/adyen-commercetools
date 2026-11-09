# Pinned by digest (multi-arch index of node:24-alpine); Renovate keeps the digest current.
FROM node:24-alpine@sha256:a34ab6d7f6f4813f4d0c5469d74685604b962fbdbf5793a7bc7b4998ecb867c8
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
