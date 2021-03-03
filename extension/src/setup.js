const config = require('./config/config')
const ctpClientBuilder = require('./ctp')
const logger = require('./utils').getLogger()
const { ensureResources } = require('./config/init/ensure-resources')

function _generateAuthorizationHeaderValue(ctpProjectKey) {
  const ctpConfig = config.getCtpConfig(ctpProjectKey)
  if (ctpConfig && ctpConfig.username && ctpConfig.password) {
    const username = ctpConfig.username
    const password = ctpConfig.password

    const decodeAuthToken = `${username}:${password}`
    return `Basic ${Buffer.from(decodeAuthToken).toString('base64')}`
  }
  return null
}

async function setupExtensionResources() {
  const moduleConfig = config.getModuleConfig()
  const ctpProjectKeys = config.getAllCtpProjectKeys()
  const adyenMerchantAccounts = config.getAllAdyenMerchantAccounts()

  await Promise.all(
    ctpProjectKeys.map(async (ctpProjectKey) => {
      const ctpConfig = config.getCtpConfig(ctpProjectKey)
      const ctpClient = ctpClientBuilder.get(ctpConfig)
      await ensureResources(
        ctpClient,
        ctpConfig.projectKey,
        moduleConfig.apiExtensionBaseUrl,
        _generateAuthorizationHeaderValue(ctpConfig.projectKey)
      )
    })
  )

  logger.info(
    `Configured commercetools project keys are: ${JSON.stringify(
      ctpProjectKeys
    )}. ` +
      `Configured adyen merchant accounts are: ${JSON.stringify(
        adyenMerchantAccounts
      )}`
  )
}

module.exports = {
  setupExtensionResources,
}
