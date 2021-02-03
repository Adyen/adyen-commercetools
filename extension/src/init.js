const pMap = require('p-map')

const server = require('./server.js').setupServer()
const utils = require('./utils')
const config = require('./config/config')
const ctpClientBuilder = require('./ctp')

const envConfig = config.getModuleConfig()

const { ensureResources } = require('./config/init/ensure-resources')

const port = parseInt(envConfig.port || 8080, 10)
const logger = utils.getLogger()

if (envConfig.keepAliveTimeout !== undefined)
  server.keepAliveTimeout = envConfig.keepAliveTimeout
server.listen(port, async () => {
  const ctpProjectKeys = config.getAllCtpProjectKeys()
  await pMap(
    ctpProjectKeys,
    async (ctpProjectKey) => {
      const ctpConfig = config.getCtpConfig(ctpProjectKey)
      if (ctpConfig.ensureResources) {
        const ctpClient = ctpClientBuilder.get(ctpConfig)
        await ensureResources(ctpClient)
      }
    },
    { concurrency: 5 }
  )

  logger.info(`Extension module is running at http://localhost:${port}/`)
})
