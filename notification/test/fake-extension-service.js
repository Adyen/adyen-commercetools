import http from 'http'
import localtunnel from 'localtunnel'

const tunnelDomain = 'ctp-adyen-integration-tests'
let tunnel
const port = 3001
let server

async function initTunnel() {
  let repeaterCounter = 0
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
      repeaterCounter += 1
    }
  }
}

async function startFakeExtensionServer() {
  server = http.createServer((req, res) => {
    res.statusCode = 200
    res.end()
  })

  return new Promise((resolve) => {
    server.listen(port, async () => {
      resolve()
    })
  })
}

async function startFakeExtension() {
  await startFakeExtensionServer()
  await initTunnel()
}

async function stopFakeExtension() {
  server.close()
  await tunnel.close()
}

export { startFakeExtension, stopFakeExtension }
