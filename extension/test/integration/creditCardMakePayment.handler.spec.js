// fake window and navigator because of adyen-cse-js module
global.window = {}
global.navigator = {}

const adyenEncrypt = require('adyen-cse-js')
const { expect } = require('chai')
const _ = require('lodash')

const ctpClientBuilder = require('../../src/ctp/ctp')
const paymentTemplate = require('../resources/payment-credit-card.json')
const iTSetUp = require('./integrationTestSetUp')

describe('credit card payment', () => {
  let ctpClient

  before(async () => {
    ctpClient = ctpClientBuilder.get()
    await iTSetUp.initServerAndExtension(ctpClient)
  })

  after(async () => {
    await iTSetUp.cleanupResources(ctpClient)
  })

  it('should create success payment', async () => {
    const key = process.env.CLIENT_ENCRYPTION_PUBLIC_KEY

    const cseInstance = adyenEncrypt.createEncryption(key, {})

    const encryptedCardNumber = cseInstance.encrypt({
      number: '4111111145551142',
      generationtime: new Date().toISOString()
    })
    const encryptedSecurityCode = cseInstance.encrypt({
      cvc: '737',
      generationtime: new Date().toISOString()
    })
    const encryptedExpiryMonth = cseInstance.encrypt({
      expiryMonth: '10',
      generationtime: new Date().toISOString()
    })
    const encryptedExpiryYear = cseInstance.encrypt({
      expiryYear: '2020',
      generationtime: new Date().toISOString()
    })
    const paymentDraft = _.template(JSON.stringify(paymentTemplate))({
      encryptedCardNumber,
      encryptedSecurityCode,
      encryptedExpiryMonth,
      encryptedExpiryYear
    })

    const response = await ctpClient.create(ctpClient.builder.payments, JSON.parse(paymentDraft))
    expect(response.statusCode).to.equal(201)
    expect(response.body.interfaceId).to.match(/^[0-9]*$/)
    const adyenResponse = JSON.parse(response.body.interfaceInteractions[0].fields.response)
    expect(adyenResponse.resultCode).to.be.equal('Authorised')
  })
})
