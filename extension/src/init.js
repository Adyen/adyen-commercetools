const server = require('./server.js').setupServer()
const utils = require('./utils')

const { ensureResources } = require('./config/init/ensure-resources')
const configLoader = require('./config/config')

const config = configLoader.load()

const port = parseInt(process.env.EXTENSION_PORT || 8080, 10)
const logger = utils.getLogger()

if (config.keepAliveTimeout !== undefined)
  server.keepAliveTimeout = config.keepAliveTimeout
server.listen(port, async () => {
  await ensureResources()
  logger.info(`Server running at http://127.0.0.1:${port}/`)
})
