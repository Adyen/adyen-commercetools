const server = require('./server.js').setupServer()
const utils = require('./utils')
const config = require('./config/config')

const moduleConfig = config.getModuleConfig()

const port = parseInt(moduleConfig.port || 8080, 10)
const logger = utils.getLogger()

if (moduleConfig.keepAliveTimeout !== undefined)
  server.keepAliveTimeout = moduleConfig.keepAliveTimeout
server.listen(port, async () => {
  logger.info(`Extension module is running at http://localhost:${port}`)
})
