import config from './config/config.mjs'
import ctpClientBuilder from './ctp.js'
import logger from './utils.mjs'
import ensureResources from './config/init/ensure-resources.js'
import auth from './validator/authentication.js'

logger.getLogger()

async function setupExtensionResources(apiExtensionBaseUrl) {
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
        apiExtensionBaseUrl || moduleConfig.apiExtensionBaseUrl,
        auth.generateBasicAuthorizationHeaderValue(ctpConfig.projectKey)
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

export default setupExtensionResources
