const server = require('./server').setupServer()
const logger = require('./utils/logger').getLogger()
const config = require('./config/config')

const moduleConfig = config.getModuleConfig()

const port = moduleConfig.port || 443

if (moduleConfig.keepAliveTimeout !== undefined)
  server.keepAliveTimeout = moduleConfig.keepAliveTimeout
server.listen(port, async () => {
  logger.info(`Notification module is running at http://localhost:${port}`)
})
