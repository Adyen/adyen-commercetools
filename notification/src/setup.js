import config from './config/config'
import logg from './utils/logger'
import { ensureInterfaceInteractionCustomTypeForAllProjects } from './config/init/ensure-interface-interaction-custom-type'

const logger = logg.getLogger()

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

export { setupNotificationResources }
