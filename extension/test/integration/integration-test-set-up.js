const ngrok = require('ngrok')   // eslint-disable-line
const serverBuilder = require('../../src/server')
const { routes: defaultRoutes } = require('../../src/routes')
const { ensureResources } = require('../../src/config/init/ensure-resources')
const testUtils = require('../test-utils')

let server

async function initServerAndExtension ({ ctpClient, testServerPort = 8000, routes = defaultRoutes }) {
  server = serverBuilder.setupServer(routes)
  const ngrokUrl = await ngrok.connect(testServerPort)
  process.env.API_EXTENSION_BASE_URL = ngrokUrl

  await testUtils.deleteAllResources(ctpClient, 'payments')
  await testUtils.deleteAllResources(ctpClient, 'types')
  await testUtils.deleteAllResources(ctpClient, 'extensions')
  return new Promise(((resolve) => {
    server.listen(testServerPort, async () => {
      await ensureResources(ctpClient)
      /* eslint-disable no-console */
      console.log(`Extension module is running at http://localhost:${testServerPort}/`)
      resolve()
    })
  }))
}

async function cleanupResources () {
  server.close()
  await ngrok.kill()
}

module.exports = {
  initServerAndExtension, cleanupResources
}
