import { setupServer } from './server.js'
import logger from './utils.js'
import config from './config/config.js'

const port = config.getModuleConfig().port || 8080

if (config.getModuleConfig().keepAliveTimeout !== undefined)
  setupServer.keepAliveTimeout = config.getModuleConfig().keepAliveTimeout
setupServer.listen(port, async () => {
  logger.info(`Extension module is running at http://localhost:${port}`)
})
