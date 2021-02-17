const server = require('./server.js').setupServer()
const logger = require('./utils').getLogger()
const config = require('./config/config')

const moduleConfig = config.getModuleConfig()

const port = moduleConfig.port || 8080

if (moduleConfig.keepAliveTimeout !== undefined)
  server.keepAliveTimeout = moduleConfig.keepAliveTimeout
server.listen(port, async () => {
  logger.info(`Extension module is running at http://localhost:${port}`)
})
