const ngrok = require('ngrok')   // eslint-disable-line
const server = require('../../src/server').setupServer()

const { ensureResources } = require('../../src/config/init/ensure-resources')
const testUtils = require('../test-utils')

async function initServerAndExtension (ctpClient, testServerPort = 8000) {
  const ngrokUrl = await ngrok.connect(testServerPort)
  process.env.API_EXTENSION_BASE_URL = ngrokUrl

  await testUtils.deleteAllResources(ctpClient, 'payments')
  await testUtils.deleteAllResources(ctpClient, 'types')
  await testUtils.deleteAllResources(ctpClient, 'extensions')
  return new Promise(((resolve) => {
    server.listen(testServerPort, async () => {
      await ensureResources()
      console.log(`Server running at http://127.0.0.1:${testServerPort}/`)
      resolve()
    })
  }))
}

async function cleanupResources (ctpClient) {
  server.close()
  await ngrok.kill()
}

module.exports = {
  initServerAndExtension, cleanupResources
}
