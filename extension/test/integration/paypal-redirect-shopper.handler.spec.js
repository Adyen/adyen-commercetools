const { expect } = require('chai')
const _ = require('lodash')

const iTSetUp = require('./integration-test-set-up')
const ctpClientBuilder = require('../../src/ctp/ctp-client')
const paymentTemplate = require('../fixtures/payment-paypal.json')

describe.skip('Paypal payment', () => {
  let ctpClient

  beforeEach(async () => {
    ctpClient = ctpClientBuilder.get()
    await iTSetUp.initServerAndExtension(ctpClient)
  })

  afterEach(async () => {
    await iTSetUp.cleanupResources()
  })

  it('should create paypal redirect', async () => {
    const paymentDraft = _.cloneDeep(paymentTemplate)
    const response = await ctpClient.create(ctpClient.builder.payments, paymentDraft)

    expect(response.statusCode).to.equal(201)
    expect(response.body.custom.fields.redirectMethod).to.equal('GET')
    expect(response.body.custom.fields.redirectUrl).to.exist

    const adyenResponse = JSON.parse(response.body.interfaceInteractions[0].fields.response)
    expect(adyenResponse.redirect.method).to.exist
    expect(adyenResponse.redirect.url).to.exist
    expect(adyenResponse.additionalData).to.not.exist
  })
})
