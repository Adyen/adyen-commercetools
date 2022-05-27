import { setupServer } from './server.js'
import { getLogger } from './utils/logger.js'
import config from './config/config.js'

const server = setupServer()
const logger = getLogger()

const moduleConfig = config.getModuleConfig()

const port = moduleConfig.port || 443

if (moduleConfig.keepAliveTimeout !== undefined)
  server.keepAliveTimeout = moduleConfig.keepAliveTimeout
server.listen(port, async () => {
  logger.info(`Notification module is running at http://localhost:${port}`)
})
