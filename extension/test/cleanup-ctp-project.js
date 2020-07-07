const ctpClientBuilder = require('../src/ctp/ctp-client')
const iTSetUp = require('./integration/integration-test-set-up')

before(async () => {
  const ctpClient = ctpClientBuilder.get()
  await iTSetUp.cleanupCtpResources(ctpClient)
})
