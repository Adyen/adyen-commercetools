const config = require('./config/config')
const { ensureWebhooks } = require('./config/init/ensure-webhooks')
const logger = require('./utils/logger').getLogger()
const {
  ensureInterfaceInteractionCustomTypeForAllProjects,
} = require('./config/init/ensure-interface-interaction-custom-type')

async function setupNotificationResources() {
  await ensureInterfaceInteractionCustomTypeForAllProjects()
  await ensureWebhooks()

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
