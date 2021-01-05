const fetch = require('node-fetch')
const _ = require('lodash')

const { createClient } = require('@commercetools/sdk-client')
const {
  createAuthMiddlewareForClientCredentialsFlow,
} = require('@commercetools/sdk-middleware-auth')
const {
  createUserAgentMiddleware,
} = require('@commercetools/sdk-middleware-user-agent')
const { createHttpMiddleware } = require('@commercetools/sdk-middleware-http')
const { createQueueMiddleware } = require('@commercetools/sdk-middleware-queue')
const { createRequestBuilder } = require('@commercetools/api-request-builder')
const packageJson = require('../package.json')

const configLoader = require('./config/config')

const config = configLoader.load()

function createCtpClient({
  clientId,
  clientSecret,
  projectKey,
  concurrency = 10,
}) {
  const authMiddleware = createAuthMiddlewareForClientCredentialsFlow({
    host: config.ctp.authUrl,
    projectKey,
    credentials: {
      clientId,
      clientSecret,
    },
    fetch,
  })

  const userAgentMiddleware = createUserAgentMiddleware({
    libraryName: packageJson.name,
    libraryVersion: `${packageJson.version}/extension`,
    contactUrl: packageJson.homepage,
    contactEmail: packageJson.author.email,
  })

  const httpMiddleware = createHttpMiddleware({
    maskSensitiveHeaderData: true,
    host: config.ctp.apiUrl,
    enableRetry: true,
    fetch,
  })

  const queueMiddleware = createQueueMiddleware({
    concurrency,
  })

  return createClient({
    middlewares: [
      authMiddleware,
      userAgentMiddleware,
      httpMiddleware,
      queueMiddleware,
    ],
  })
}

function setUpClient() {
  const ctpClient = createCtpClient(config.ctp)
  const customMethods = {
    get builder() {
      return getRequestBuilder(config.ctp.projectKey)
    },

    delete(uri, id, version) {
      return ctpClient.execute(
        this.buildRequestOptions(
          uri.byId(id).withVersion(version).build(),
          'DELETE'
        )
      )
    },

    create(uri, body) {
      return ctpClient.execute(
        this.buildRequestOptions(uri.build(), 'POST', body)
      )
    },

    update(uri, id, version, actions) {
      const body = {
        version,
        actions,
      }
      return ctpClient.execute(
        this.buildRequestOptions(uri.byId(id).build(), 'POST', body)
      )
    },

    fetch(uri) {
      return ctpClient.execute(this.buildRequestOptions(uri.build()))
    },

    fetchBatches(uri, callback, opts = { accumulate: false }) {
      return this.process(
        this.buildRequestOptions(uri.build()),
        (data) => Promise.resolve(callback(data.body.results)),
        opts
      )
    },

    buildRequestOptions(uri, method = 'GET', body = undefined) {
      return {
        uri,
        method,
        body,
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      }
    },
  }
  return _.merge(customMethods, ctpClient)
}

function getRequestBuilder(projectKey) {
  return createRequestBuilder({ projectKey })
}

module.exports = {
  get: () => setUpClient(),
}
