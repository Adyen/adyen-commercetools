import { setupServer } from './server.js'
import utils from './utils.js'
import config from './config/config.js'

const port = config.getModuleConfig().port || 8080

const server = setupServer()
const logger = utils.getLogger()

if (config.getModuleConfig().keepAliveTimeout !== undefined)
  server.keepAliveTimeout = config.getModuleConfig().keepAliveTimeout
server.listen(port, async () => {
  logger.info(`Extension module is running at http://localhost:${port}`)
})
