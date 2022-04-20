import server from './server.js'
import logger from './utils.js'
import config from './config/config.cjs'

const moduleConfig = config.getModuleConfig()

const port = moduleConfig.port || 8080

if (moduleConfig.keepAliveTimeout !== undefined)
  server.keepAliveTimeout = moduleConfig.keepAliveTimeout
server.listen(port, async () => {
  logger.info(`Extension module is running at http://localhost:${port}`)
})
