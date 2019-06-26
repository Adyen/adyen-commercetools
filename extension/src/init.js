const server = require('./server.js').setupServer()
const utils = require('./utils')
const configLoader = require('./config/config')

const config = configLoader.load()

const { ensureResources } = require('./config/init/ensure-resources')

const port = parseInt(config.port || 8080, 10)
const logger = utils.getLogger()

// raise an exception when there are no CTP credentials
if (!config.ctp.projectKey || !config.ctp.clientId || !config.ctp.clientSecret)
  throw new Error('CTP project credentials are missing')

if (config.keepAliveTimeout !== undefined)
  server.keepAliveTimeout = config.keepAliveTimeout
server.listen(port, async () => {
  await ensureResources()
  logger.info(`Server running at http://127.0.0.1:${port}/`)
})
