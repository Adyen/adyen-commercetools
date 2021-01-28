const server = require('./server.js').setupServer()
const {
  ensureInterfaceInteractionCustomType,
} = require('./config/init/ensure-interface-interaction-custom-type')
const logger = require('./utils/logger').getLogger()
const config = require('./config/config')

const PORT = process.env.PORT || 443

if (config.getModuleConfig().keepAliveTimeout !== undefined)
  server.keepAliveTimeout = config.getModuleConfig().keepAliveTimeout
server.listen(PORT, async () => {
  await ensureInterfaceInteractionCustomType()
  logger.info(`Server started on ${PORT} port`)
})
