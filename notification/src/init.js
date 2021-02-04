const server = require('./server.js').setupServer()
const {
  ensureInterfaceInteractionCustomTypeForAllProjects,
} = require('./config/init/ensure-interface-interaction-custom-type')
const logger = require('./utils/logger').getLogger()
const config = require('./config/config')

const PORT = config.getModuleConfig().port || 443

if (config.getModuleConfig().keepAliveTimeout !== undefined)
  server.keepAliveTimeout = config.getModuleConfig().keepAliveTimeout
server.listen(PORT, async () => {
  await ensureInterfaceInteractionCustomTypeForAllProjects()
  const ctpProjectKeys = config.getAllCtpProjectKeys()
  const adyenMerchantAccounts = config.getAllAdyenMerchantAccounts()
  logger.info(`Server started on ${PORT} port. `
    + `Configured commercetools project keys are: ${JSON.stringify(ctpProjectKeys)}. `
    + `Configured adyen merchant accounts are: ${JSON.stringify(adyenMerchantAccounts)}`)
})
