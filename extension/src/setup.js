const config = require('./config/config')
const ctpClientBuilder = require('./ctp')
const logger = require('./utils').getLogger()
const { ensureResources } = require('./config/init/ensure-resources')

async function setupExtensionResources() {
  const moduleConfig = config.getModuleConfig()
  const ctpProjectKeys = config.getAllCtpProjectKeys()
  const adyenMerchantAccounts = config.getAllAdyenMerchantAccounts()

  await Promise.all(
    ctpProjectKeys.map(async (ctpProjectKey) => {
      const ctpConfig = config.getCtpConfig(ctpProjectKey)
      if (ctpConfig.ensureResources) {
        const ctpClient = ctpClientBuilder.get(ctpConfig)
        await ensureResources(
          ctpClient,
          ctpConfig.projectKey,
          moduleConfig.apiExtensionBaseUrl
        )
      }
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
