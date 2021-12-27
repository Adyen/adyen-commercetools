const localtunnel = require('localtunnel')
const serverBuilder = require('../src/server')
const { routes } = require('../src/routes')
const { setupExtensionResources } = require('../src/setup')
const config = require('../src/config/config')

global.window = {}
global.navigator = {}

process.on('unhandledRejection', (reason) => {
  /* eslint-disable no-console */
  console.error('Unhandled Rejection:', reason)
  process.exit(1)
})

const port = 3000
const tunnelDomain = 'ctp-adyen-integration-tests'
let tunnel
let server

async function startIT() {
  await setupLocalServer()
  if (process.env.CI) {
    // this part used only on github actions (CI)
    await setupExtensionResources(process.env.CI_EXTENSION_BASE_URL)
    // e2e requires this for static forms
    overrideApiExtensionBaseUrlConfig(`http://localhost:${port}`)
  } else {
    await setupLocalTunnel()
    await setupExtensionResources()
  }
}

async function stopIT() {
  server.close()
  if (!process.env.CI) {
    // this part is not used on github actions (CI)
    await tunnel.close()
  }
}

function setupLocalServer() {
  server = serverBuilder.setupServer(routes)
  return new Promise((resolve) => {
    server.listen(port, async () => {
      resolve()
    })
  })
}

function overrideApiExtensionBaseUrlConfig(apiExtensionBaseUrl) {
  const moduleConfig = config.getModuleConfig()
  moduleConfig.apiExtensionBaseUrl = apiExtensionBaseUrl
  config.getModuleConfig = function getModuleConfig() {
    return moduleConfig
  }
  module.exports = config
}

async function setupLocalTunnel() {
  tunnel = await initTunnel(port)
  const apiExtensionBaseUrl = tunnel.url
  overrideApiExtensionBaseUrlConfig(apiExtensionBaseUrl)
}

async function initTunnel() {
  let repeaterCounter = 0
  // eslint-disable-next-line no-shadow
  let tunnel
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      tunnel = await localtunnel({
        port,
        subdomain: tunnelDomain,
      })
      break
    } catch (e) {
      if (repeaterCounter === 10) throw e
      repeaterCounter++
    }
  }
  return tunnel
}

module.exports = {
  startIT,
  stopIT,
}
