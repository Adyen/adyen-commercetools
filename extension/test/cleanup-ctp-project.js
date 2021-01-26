const ctpClientBuilder = require('../src/ctp')
const iTSetUp = require('./integration/integration-test-set-up')
const config = require('../src/config/config')

before(async () => {
  const ctpProjectKeys = config.getAllCtpProjectKeys()
  for (const projectKey of ctpProjectKeys) {
    const ctpClient = ctpClientBuilder.get(projectKey)
    await iTSetUp.cleanupCtpResources(ctpClient)
  }
})
