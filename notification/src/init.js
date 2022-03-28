import serve from './server'
import logg from './utils/logger'
import config from './config/config'

const server = serve.setupServer()
const logger = logg.getLogger()

const moduleConfig = config.getModuleConfig()

const port = moduleConfig.port || 443

if (moduleConfig.keepAliveTimeout !== undefined)
  server.keepAliveTimeout = moduleConfig.keepAliveTimeout
server.listen(port, async () => {
  logger.info(`Notification module is running at http://localhost:${port}`)
})
