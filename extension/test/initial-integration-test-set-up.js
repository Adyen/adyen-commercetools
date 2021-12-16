const ctpClientBuilder = require('../src/ctp')
const iTSetUp = require('./integration/integration-test-set-up')
const config = require('../src/config/config')
const { setupExtensionResources } = require('../src/setup')

before(async () => {
  if (process.env.CI) {
    // Github actions sets CI env variable to true.
    await setupCI()
  } else {
    await setupLocal()
  }
})

after(async () => {
  if (process.env.CI) {
    // this part used only for debugging purposes (localhost)
    await iTSetUp.stopRunningServers()
  }
})

// this part used only for debugging purposes (localhost)
async function setupLocal() {
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

// this part used only on github actions (CI)
async function setupCI() {
  await setupExtensionResources(process.env.CI_EXTENSION_BASE_URL)
}
