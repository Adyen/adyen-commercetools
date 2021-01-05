const { merge } = require('lodash')
const { createClient } = require('@commercetools/sdk-client')
const { createRequestBuilder } = require('@commercetools/api-request-builder')

function createCtpClient() {
  const httpMockSuccessMiddleware = (next) => (request, response) => {
    next(request, { ...response, body: { foo: 'bar' } })
  }

  return createClient({
    middlewares: [httpMockSuccessMiddleware],
  })
}

function setUpClient(config) {
  const ctpClient = createCtpClient(config.ctp)
  const customMethods = {
    get builder() {
      return getRequestBuilder(config.ctp.projectKey)
    },

    delete() {
      return this
    },

    create() {
      return this
    },

    update() {
      return this
    },

    fetch() {
      return this
    },

    fetchById() {
      return this
    },

    fetchByKey() {
      return this
    },

    fetchBatches() {
      return this
    },

    buildRequestOptions() {
      return this
    },
  }
  return merge(customMethods, ctpClient)
}

function getRequestBuilder(projectKey) {
  return createRequestBuilder({ projectKey })
}

/**
 * Compares transaction states
 * @param currentState state of the transaction from the platform
 * @param newState state of the transaction from the Adyen notification
 * @return number 1 if newState can appear after currentState
 * -1 if newState cannot appear after currentState
 * 0 if newState is the same as currentState
 * @throws Error when newState and/or currentState is a wrong transaction state
 * */
function compareTransactionStates(currentState, newState) {
  const transactionStateFlow = {
    Initial: 0,
    Pending: 1,
    Success: 2,
    Failure: 2,
  }
  if (
    !transactionStateFlow.hasOwnProperty(currentState) ||
    !transactionStateFlow.hasOwnProperty(newState)
  )
    throw Error(
      'Wrong transaction state passed. ' +
        `currentState: ${currentState}, newState: ${newState}`
    )
  if (transactionStateFlow[currentState] < transactionStateFlow[newState])
    return 1
  if (transactionStateFlow[currentState] > transactionStateFlow[newState])
    return -1
  return 0
}

module.exports = {
  get: (config) => setUpClient(config),
  compareTransactionStates,
}
