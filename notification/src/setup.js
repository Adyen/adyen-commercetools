const config = require('./config/config')
const logger = require('./utils/logger').getLogger()
const {
  ensureInterfaceInteractionCustomTypeForAllProjects,
} = require('./config/init/ensure-interface-interaction-custom-type')

async function setupNotificationResources() {
  await ensureInterfaceInteractionCustomTypeForAllProjects()

  const ctpProjectKeys = config.getAllCtpProjectKeys()
  const adyenMerchantAccounts = config.getAllAdyenMerchantAccounts()

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
  setupNotificationResources,
}
