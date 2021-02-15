const server = require('./server.js').setupServer()
const logger = require('./utils/logger').getLogger()
const config = require('./config/config')
const { setupNotificationResources } = require('./setup')

const PORT = config.getModuleConfig().port || 443

if (config.getModuleConfig().keepAliveTimeout !== undefined)
  server.keepAliveTimeout = config.getModuleConfig().keepAliveTimeout
server.listen(PORT, async () => {
  await setupNotificationResources()
  logger.info(`Server started on ${PORT} port.`)
})
