// fake window and navigator because of adyen-cse-js module
global.window = {}
global.navigator = {}

const adyenEncrypt = require('adyen-cse-js')
const { expect } = require('chai')
const _ = require('lodash')

const ctpClientBuilder = require('../../src/ctp/ctp')
const paymentTemplate = require('../resources/payment-credit-card.json')
const payment3dTemplate = require('../resources/payment-credit-card-3d.json')
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
    const interfaceInteraction = response.body.interfaceInteractions[0].fields
    const adyenResponse = JSON.parse(interfaceInteraction.response)
    expect(adyenResponse.resultCode).to.be.equal('Authorised')
    expect(interfaceInteraction.status).to.equal('SUCCESS')
    expect(interfaceInteraction.type).to.equal('makePayment')
    const { transactions } = response.body
    expect(transactions).to.have.lengthOf(1)
    expect(transactions[0].type).to.equal('Charge')
    expect(transactions[0].state).to.equal('Success')
  })

  it('should create 3ds redirect', async () => {
    const key = process.env.CLIENT_ENCRYPTION_PUBLIC_KEY
    const ngrokUrl = process.env.API_EXTENSION_BASE_URL

    const cseInstance = adyenEncrypt.createEncryption(key, {})

    const encryptedCardNumber = cseInstance.encrypt({
      number: '5212345678901234',
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
    const paymentDraft = _.template(JSON.stringify(payment3dTemplate))({
      encryptedCardNumber,
      encryptedSecurityCode,
      encryptedExpiryMonth,
      encryptedExpiryYear,
      returnUrl: `${ngrokUrl}/test-return-url`
    })
    const response = await ctpClient.create(ctpClient.builder.payments, JSON.parse(paymentDraft))
    expect(response.statusCode).to.equal(201)
    const adyenResponse = JSON.parse(response.body.interfaceInteractions[0].fields.response)
    expect(adyenResponse.redirect.data.PaReq).to.exist
    expect(adyenResponse.redirect.data.TermUrl).to.exist
    expect(adyenResponse.redirect.data.MD).to.exist
    expect(adyenResponse.redirect.method).to.exist
    expect(adyenResponse.redirect.url).to.exist
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
