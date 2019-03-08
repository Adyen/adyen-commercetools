const url = require('url')

const serverFn = require('../extension/src/server')
const httpUtils = require('../extension/src/utils')
const ctpClientBuilder = require('../extension/src/ctp/ctp-client')
const { routes } = require('../extension/src/routes')

async function addTestRoutes () {
  /**
   * Simulation of frontend endpoint after customer returns from 3DS confirmation.
   *
   * Frontend has to save PaRes from the response query into the payment object in order to invoke API extension.
   */
  routes['/3ds-return-url'] = async (request, response) => {
    const formDataBuffer = await httpUtils.collectRequestData(request)
    const { MD, PaRes } = url.parse(`q?${formDataBuffer.toString()}`, { parseQueryString: true }).query
    const ctpClient = ctpClientBuilder.get()
    const uri = ctpClient.builder.payments
    const actions = [{
      action: 'setCustomField',
      name: 'PaRes',
      value: PaRes
    }]
    const query = `custom(fields(MD="${MD}"))`
    const { body: { results: [paymentObject] } } = await ctpClient.fetch(ctpClient.builder.payments.where(query))
    const updateResponse = await ctpClient.update(uri, paymentObject.id, paymentObject.version, actions)
    response.writeHead(200, { 'Content-Type': 'text/html' })
    response.end(`<div id="paymentObject">${JSON.stringify(updateResponse)}</div>`)
  }
}

async function initServer (port) {
  await addTestRoutes()

  return new Promise(((resolve) => {
    serverFn.setupServer(routes).listen(port, async () => {
      console.log(`Server running at http://127.0.0.1:${port}/`)
      resolve()
    })
  }))
}

initServer(8000)
