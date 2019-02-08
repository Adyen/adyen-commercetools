// fake window and navigator because of adyen-cse-js module
global.window = {}
global.navigator = {}

const adyenEncrypt = require('adyen-cse-js')
const { expect } = require('chai')
const _ = require('lodash')

const ctpClientBuilder = require('../../src/ctp/ctp')
const paymentTemplate = require('../resources/payment-credit-card.json')
const iTSetUp = require('./integrationTestSetUp')
const c = require('../../src/config/constants')

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
    const { transactions } = response.body
    expect(transactions).to.have.lengthOf(1)
    expect(transactions[0].type).to.equal('Charge')
    expect(transactions[0].state).to.equal('Success')
  })

  it('on wrong credit card number, should log error to interface interaction', async () => {
    const key = process.env.CLIENT_ENCRYPTION_PUBLIC_KEY

    const cseInstance = adyenEncrypt.createEncryption(key, {})

    const encryptedCardNumber = cseInstance.encrypt({
      number: '0123456789123456',
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
    expect(response.body.interfaceId).to.be.undefined
    expect(response.body.interfaceInteractions[0].fields.status).to.equal(c.FAILURE)
    const adyenResponse = JSON.parse(response.body.interfaceInteractions[0].fields.response)
    expect(adyenResponse.errorCode).to.match(/^[0-9]*$/)
    expect(adyenResponse.errorType).to.equal('validation')
    const { transactions } = response.body
    expect(transactions).to.have.lengthOf(1)
    const transaction = transactions[0]
    expect(transaction.type).to.equal('Charge')
    expect(transaction.state).to.equal('Initial')
  })
})
