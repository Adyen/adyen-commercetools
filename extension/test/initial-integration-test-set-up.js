const ctpClientBuilder = require('../src/ctp')
const iTSetUp = require('./integration/integration-test-set-up')
const config = require('../src/config/config')

before(async () => {
  if (process.env.CI) {
    // Github actions sets CI env variable to true.

  } else {
    await iTSetUp.initServerAndTunnel()
    const ctpProjectKeys = config.getAllCtpProjectKeys()
    await Promise.all(
      ctpProjectKeys.map(async (ctpProjectKey) => {
        const ctpConfig = config.getCtpConfig(ctpProjectKey)
        const ctpClient = ctpClientBuilder.get(ctpConfig)
        await iTSetUp.initResources(ctpClient, ctpProjectKey)
      })
    )
  }
})

after(async () => {
  if (process.env.CI) {
    // Github actions sets CI env variable to true.
  } else {
    await iTSetUp.stopRunningServers()
  }
})
