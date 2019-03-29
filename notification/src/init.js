const server = require('./server.js').setupServer()
const { ensureInterfaceInteractionCustomType } = require('./config/init/ensure-interface-interaction-custom-type')
const ctp = require('./utils/ctp')
const config = require('./config/config')()
const logger = require('./utils/logger').getLogger(config.logLevel)
const ctpClient = ctp.get(config)

const PORT = process.env.PORT || 443

server.listen(PORT, async () => {
  await ensureInterfaceInteractionCustomType(ctpClient)
  logger.info(`Server started on ${PORT} port`)
})
