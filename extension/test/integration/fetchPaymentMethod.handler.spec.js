const { expect } = require('chai')
const _ = require('lodash')

const ctpClientBuilder = require('../../src/ctp/ctp')
const paymentTemplate = require('../resources/payment-no-method.json')
const iTSetUp = require('./integrationTestSetUp')

describe('fetch payment', () => {
  let ctpClient

  before(async () => {
    ctpClient = ctpClientBuilder.get()
    await iTSetUp.initServerAndExtension(ctpClient)
  })

  after(async () => {
    await iTSetUp.cleanupResources(ctpClient)
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
