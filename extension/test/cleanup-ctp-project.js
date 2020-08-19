const ctpClientBuilder = require('../src/ctp')
const iTSetUp = require('./integration/integration-test-set-up')

before(async () => {
  const ctpClient = ctpClientBuilder.get()
  await iTSetUp.cleanupCtpResources(ctpClient)
})
