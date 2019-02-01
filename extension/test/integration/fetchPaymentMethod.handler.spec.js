const ngrok = require('ngrok')
const { expect } = require('chai')
const _ = require('lodash')

const testUtils = require('../test-utils')
const server = require('../../src/server')
const ctpClientBuilder = require('../../src/ctp/ctp')
const paymentTemplate = require('../resources/payment-no-method.json')
const { initResources } = require('../../src/config/init/initResources')

describe('fetch payment', () => {
  const testServerPort = 8000
  let ngrokUrl
  let ctpClient

  before(async () => {
    ctpClient = ctpClientBuilder.get()
    ngrokUrl = await ngrok.connect(testServerPort)
    process.env.API_EXTENSION_BASE_URL = ngrokUrl

    await testUtils.deleteAllResources(ctpClient, 'payments')
    await testUtils.deleteAllResources(ctpClient, 'types')
    await testUtils.deleteAllResources(ctpClient, 'extensions')
    return new Promise(((resolve) => {
      server.listen(testServerPort, async () => {
        await initResources()
        console.log(`Server running at http://127.0.0.1:${testServerPort}/`)
        resolve()
      })
    }))
  })

  after(async () => {
    await testUtils.deleteAllResources(ctpClient, 'payments')
    await testUtils.deleteAllResources(ctpClient, 'types')
    await testUtils.deleteAllResources(ctpClient, 'extensions')
    server.close()
  })

  it('should fetch payment methods when no method set', async () => {
    const paymentTplClone = _.cloneDeep(paymentTemplate)
    const response = await ctpClient.create(ctpClient.builder.payments, paymentTplClone)
    expect(response.statusCode).to.equal(201)
    const adyenResponse = JSON.parse(response.body.interfaceInteractions[0].fields.response)
    expect(adyenResponse.groups).to.be.an.instanceof(Array)
    expect(adyenResponse.paymentMethods).to.be.an.instanceof(Array)
  })
})
