import fetch from 'node-fetch'
import lodash from 'lodash'
import { createClient } from '@commercetools/sdk-client'
import { createAuthMiddlewareForClientCredentialsFlow } from '@commercetools/sdk-middleware-auth'
import { createUserAgentMiddleware } from '@commercetools/sdk-middleware-user-agent'
import { createHttpMiddleware } from '@commercetools/sdk-middleware-http'
import { createQueueMiddleware } from '@commercetools/sdk-middleware-queue'
import { createRequestBuilder } from '@commercetools/api-request-builder'
import utils from './utils.js'

const { merge } = lodash
/**

The token projectKeyToAuthResultMap caches the access tokens (based on projectKey) obtained through
 the client credentials flow between different clients.

The projectKeyToAuthResultMap is used by middleware to avoid authentication each time when
 it's needed to create an authentication token.

 When the token expires the sdk-middleware-auth is refreshing the token.

projectKeyToAuthResultMap representation: {
  token, expirationTime, refreshToken
}

tokenCacheOptions representation : {
    clientId, host, projectKey
}
 */
const tokenCache = {
  projectKeyToAuthResultMap: {},
  get(tokenCacheOptions) {
    return this.projectKeyToAuthResultMap[tokenCacheOptions.projectKey]
  },
  set(cache, tokenCacheOptions) {
    this.projectKeyToAuthResultMap[tokenCacheOptions.projectKey] = cache
  },
}

async function createCtpClient({
  clientId,
  clientSecret,
  projectKey,
  authUrl,
  apiUrl,
  concurrency = 10,
}) {
  const authMiddleware = createAuthMiddlewareForClientCredentialsFlow({
    host: authUrl,
    projectKey,
    credentials: {
      clientId,
      clientSecret,
    },
    fetch,
    tokenCache,
  })

  const packageJson = await utils.readAndParseJsonFile('package.json')

  const userAgentMiddleware = createUserAgentMiddleware({
    libraryName: packageJson.name,
    libraryVersion: `${packageJson.version}`,
    contactUrl: packageJson.homepage,
    contactEmail: packageJson.author.email,
  })

  const httpMiddleware = createHttpMiddleware({
    maskSensitiveHeaderData: true,
    host: apiUrl,
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

async function setUpClient(config) {
  const ctpClient = await createCtpClient(config)
  const customMethods = {
    get builder() {
      return getRequestBuilder(config.projectKey)
    },

    delete(uri, id, version) {
      return ctpClient.execute(
        this.buildRequestOptions(
          uri.byId(id).withVersion(version).build(),
          'DELETE',
        ),
      )
    },

    create(uri, body) {
      return ctpClient.execute(
        this.buildRequestOptions(uri.build(), 'POST', body),
      )
    },

    update(uri, id, version, actions) {
      const body = {
        version,
        actions,
      }
      return ctpClient.execute(
        this.buildRequestOptions(uri.byId(id).build(), 'POST', body),
      )
    },

    fetch(uri) {
      return ctpClient.execute(this.buildRequestOptions(uri.build()))
    },

    fetchById(uri, id) {
      return ctpClient.execute(this.buildRequestOptions(uri.byId(id).build()))
    },

    fetchByKey(uri, key) {
      return ctpClient.execute(this.buildRequestOptions(uri.byKey(key).build()))
    },

    fetchBatches(uri, callback, opts = { accumulate: false }) {
      return this.process(
        this.buildRequestOptions(uri.build()),
        (data) => Promise.resolve(callback(data.body.results)),
        opts,
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
  return merge(customMethods, ctpClient)
}

function getRequestBuilder(projectKey) {
  return createRequestBuilder({ projectKey })
}

export default {
  get: (config) => setUpClient(config),
}
