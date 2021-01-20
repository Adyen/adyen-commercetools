const pMap = require('p-map')
const { ensurePaymentCustomType } = require('./ensure-payment-custom-type')
const {
  ensureInterfaceInteractionCustomType,
} = require('./ensure-interface-interaction-custom-type')
const { ensureApiExtensions } = require('./ensure-api-extensions')
const config = require('../../config/config')

function ensureCustomTypes(ctpClient) {
  return Promise.all([
    ensurePaymentCustomType(ctpClient),
    ensureInterfaceInteractionCustomType(ctpClient),
  ])
}

function ensureResources(ctpClient) {
  const envConfig = config.getEnvConfig()
  if (!envConfig.ensureResources) return Promise.resolve()

  return pMap([config.ctp.projectKey], () =>
    Promise.all([
      ensureCustomTypes(ctpClient),
      ensureApiExtensions(ctpClient, envConfig.apiExtensionBaseUrl),
    ])
  )
}

module.exports = {
  ensureResources,
}
