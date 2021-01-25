const server = require('./server.js').setupServer()
const {
  ensureInterfaceInteractionCustomType,
} = require('./config/init/ensure-interface-interaction-custom-type')
const ctp = require('./utils/ctp')
const logger = require('./utils/logger').getLogger()
const config = require('./config/config')()

const ctpClient = ctp.get(config)

const PORT = process.env.PORT || 443

if (config.keepAliveTimeout !== undefined)
  server.keepAliveTimeout = config.keepAliveTimeout
server.listen(PORT, async () => {
  await ensureInterfaceInteractionCustomType(ctpClient)
  logger.info(`Server started on ${PORT} port`)
})
