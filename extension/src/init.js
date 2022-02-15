import server from './server.cjs'
import logger from './utils'
import config from './config/config'

server.setupServer()
logger.getLogger()

const moduleConfig = config.getModuleConfig()

const port = moduleConfig.port || 8080

if (moduleConfig.keepAliveTimeout !== undefined)
  server.keepAliveTimeout = moduleConfig.keepAliveTimeout
server.listen(port, async () => {
  logger.info(`Extension module is running at http://localhost:${port}`)
})
