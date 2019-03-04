const fetch = require('node-fetch')
const _ = require('lodash')

const { createClient } = require('@commercetools/sdk-client')
const { createAuthMiddlewareForClientCredentialsFlow } = require('@commercetools/sdk-middleware-auth')
const { createHttpMiddleware } = require('@commercetools/sdk-middleware-http')
const { createQueueMiddleware } = require('@commercetools/sdk-middleware-queue')
const { createRequestBuilder } = require('@commercetools/api-request-builder')

const config = require('../config/config')

function createCtpClient ({
  clientId, clientSecret, projectKey, authUrl, apiUrl, concurrency = 10
}) {
  const authMiddleware = createAuthMiddlewareForClientCredentialsFlow({
    host: authUrl,
    projectKey,
    credentials: {
      clientId,
      clientSecret
    },
    fetch
  })

  const httpMiddleware = createHttpMiddleware({
    maskSensitiveHeaderData: true,
    host: apiUrl,
    enableRetry: true,
    fetch
  })

  const queueMiddleware = createQueueMiddleware({
    concurrency,
  })

  return createClient({
    middlewares: [
      authMiddleware,
      httpMiddleware,
      queueMiddleware
    ],
  })
}

function setUpClient () {
  const ctpClient = createCtpClient(config.load().ctp)
  const customMethods = {
    get builder () {
      return getRequestBuilder(config.load().ctp.projectKey)
    },
    delete (uri, id, version) {
      return ctpClient.execute(this.buildRequestOptions(
        uri.byId(id).withVersion(version).build(),
        'DELETE'
      ))
    },
    create (uri, body) {
      return ctpClient.execute(this.buildRequestOptions(uri.build(), 'POST', body))
    },
    update (uri, id, version, actions) {
      const body = {
        version,
        actions
      }
      return ctpClient.execute(
        this.buildRequestOptions(uri.byId(id).build(), 'POST', body)
      )
    },
    fetch (uri) {
      return ctpClient.execute(this.buildRequestOptions(uri.build()))
    },
    buildRequestOptions (uri, method = 'GET', body = undefined) {
      return {
        uri,
        method,
        body,
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        }
      }
    }
  }
  return _.merge(customMethods, ctpClient)
}

function getRequestBuilder (projectKey) {
  return createRequestBuilder({ projectKey })
}

module.exports = {
  get: () => setUpClient()
}
