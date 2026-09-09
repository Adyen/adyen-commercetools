import fetch from 'node-fetch'
import lodash from 'lodash'
import { ClientBuilder } from '@commercetools/sdk-client-v2'
import { createRequestBuilder } from '@commercetools/api-request-builder'
import utils from './commons.js'

const { merge } = lodash

const tokenCache = {
  store: {},
  get(tokenCacheOptions) {
    return this.store[tokenCacheOptions.projectKey]
  },
  set(cache, tokenCacheOptions) {
    this.store[tokenCacheOptions.projectKey] = cache
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
  const authMiddlewareOptions = {
    host: authUrl,
    projectKey,
    credentials: {
      clientId,
      clientSecret,
    },
    fetch,
    tokenCache,
  }

  const httpMiddlewareOptions = {
    maskSensitiveHeaderData: true,
    host: apiUrl,
    enableRetry: true,
    fetch,
  }

  const queueMiddlewareOptions = {
    concurrency,
  }

  const packageJson = await utils.readAndParseJsonFile('package.json')

  const userAgentMiddlewareOptions = {
    libraryName: packageJson.name,
    libraryVersion: `${packageJson.version}`,
    contactUrl: packageJson.homepage,
    contactEmail: packageJson.author.email,
  }

  return new ClientBuilder()
    .withProjectKey(projectKey)
    .withClientCredentialsFlow(authMiddlewareOptions)
    .withHttpMiddleware(httpMiddlewareOptions)
    .withQueueMiddleware(queueMiddlewareOptions)
    .withUserAgentMiddleware(userAgentMiddlewareOptions)
    .build()
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

    fetchByCustomField(uri, field, value) {
      return ctpClient.execute(
        this.buildRequestOptions(
          uri.where(`custom(fields(${field}="${value}"))`).build(),
        ),
      )
    },

    fetchByKeys(uri, keys) {
      const keyList = keys.map((key) => `"${key}"`)
      const keyConditions = `key in (${keyList.join(',')})`

      return ctpClient.execute(
        this.buildRequestOptions(uri.where(keyConditions).build()),
      )
    },

    fetchBatches(uri, callback, opts = { accumulate: false }) {
      return this.process(
        this.buildRequestOptions(uri.build()),
        (data) => callback(data.body.results),
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
