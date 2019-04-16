const init = require('./server.js').setupServer()
const utils = require('./utils')

const { ensureResources } = require('./config/init/ensure-resources')

const port = parseInt(process.env.EXTENSION_PORT || 8080, 10)
const logger = utils.getLogger()

init.listen(port, async () => {
  await ensureResources()
  logger.info(`Server running at http://127.0.0.1:${port}/`)
})
