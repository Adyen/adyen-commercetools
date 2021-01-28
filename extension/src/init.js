const pMap = require('p-map')

const server = require('./server.js').setupServer()
const utils = require('./utils')
const config = require('./config/config')
const ctpClientBuilder = require('./ctp')

const moduleConfig = config.getModuleConfig()

const { ensureResources } = require('./config/init/ensure-resources')

const port = parseInt(moduleConfig.port || 8080, 10)
const logger = utils.getLogger()

if (moduleConfig.keepAliveTimeout !== undefined)
  server.keepAliveTimeout = moduleConfig.keepAliveTimeout
server.listen(port, async () => {
  const ctpProjectKeys = config.getAllCtpProjectKeys()
  await pMap(ctpProjectKeys, async (ctpProjectKey) => {
    const ctpConfig = config.getCtpConfig(ctpProjectKey)
    if (ctpConfig.ensureResources) {
      const ctpClient = ctpClientBuilder.get(ctpProjectKey)
      await ensureResources(ctpClient, moduleConfig.apiExtensionBaseUrl)
    }
  })

  logger.info(`Extension module is running at http://localhost:${port}/`)
})
