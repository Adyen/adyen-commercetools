const ctpClientBuilder = require('../src/ctp')
const iTSetUp = require('./integration/integration-test-set-up')
const config = require('../src/config/config')

before(async () => {
  const ctpProjectKeys = config.getAllCtpProjectKeys()
  for (const ctpProjectKey of ctpProjectKeys) {
    const ctpConfig = config.getCtpConfig(ctpProjectKey)
    const ctpClient = ctpClientBuilder.get(ctpConfig)
    await iTSetUp.cleanupCtpResources(ctpClient)
  }
})
