const ctpClientBuilder = require('../src/ctp')
const iTSetUp = require('./integration/integration-test-set-up')

before(async () => {
  const configJson = JSON.parse(process.env.ADYEN_INTEGRATION_CONFIG)
  for (const [projectKey, ] of Object.entries(configJson.commercetools)) {
    const ctpClient = ctpClientBuilder.get(projectKey)
    await iTSetUp.cleanupCtpResources(ctpClient)
  }
})
