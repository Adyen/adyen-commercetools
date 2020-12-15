FROM node:12 as build-env
ADD . /app
WORKDIR /app
RUN npm ci --only=production

FROM gcr.io/distroless/nodejs:12
COPY --from=build-env /app /app
WORKDIR /app
CMD ["./src/init.js"]
