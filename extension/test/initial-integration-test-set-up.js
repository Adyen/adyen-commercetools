const ctpClientBuilder = require('../src/ctp')
const iTSetUp = require('./integration/integration-test-set-up')
const config = require('../src/config/config')
const { deleteAllResources } = require('./test-utils')

before(async () => {
  await iTSetUp.initServerAndTunnel()
  const ctpProjectKeys = config.getAllCtpProjectKeys()
  await Promise.all(
    ctpProjectKeys.map(async (ctpProjectKey) => {
      const ctpConfig = config.getCtpConfig(ctpProjectKey)
      const ctpClient = ctpClientBuilder.get(ctpConfig)
      await iTSetUp.cleanupCtpResources(ctpClient)
      await deleteAllResources(ctpClient, 'extensions')
      await deleteAllResources(ctpClient, 'types')
      await iTSetUp.initExtension(ctpClient, ctpProjectKey)
    })
  )
})

after(async () => {
  await iTSetUp.stopRunningServers()
})
