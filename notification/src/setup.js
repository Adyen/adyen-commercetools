import config from './config/config.js'
import { getLogger } from './utils/logger.js'
// eslint-disable-next-line max-len
import { ensureInterfaceInteractionCustomTypeForAllProjects } from './config/init/ensure-interface-interaction-custom-type.js'
import { ensureAdyenWebhooksForAllProjects } from './config/init/ensure-adyen-webhook.js'

const logger = getLogger()

async function setupNotificationResources() {
  await ensureAdyenWebhooksForAllProjects()
  await ensureInterfaceInteractionCustomTypeForAllProjects()

  const ctpProjectKeys = config.getAllCtpProjectKeys()
  const adyenMerchantAccounts = config.getAllAdyenMerchantAccounts()

  logger.info(
    `Configured commercetools project keys are: ${JSON.stringify(
      ctpProjectKeys,
    )}. ` +
      `Configured adyen merchant accounts are: ${JSON.stringify(
        adyenMerchantAccounts,
      )}`,
  )
}

export { setupNotificationResources }
