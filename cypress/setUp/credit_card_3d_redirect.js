// Create fake payment object with correct fields in order to perform credit card 3DS payment

// fake window and navigator because of adyen-cse-js module
global.window = {}
global.navigator = {}

const adyenEncrypt = require('adyen-cse-js')
const _ = require('lodash')
const ctpClientBuilder = require('../../extension/src/ctp/ctpClient')
const payment3dTemplate = require('../../extension/test/resources/payment-credit-card-3d.json')

const key = process.env.CLIENT_ENCRYPTION_PUBLIC_KEY

function init () {
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
    returnUrl: `${ngrokUrl}/3ds-return-url`
  })

  const ctpClient = ctpClientBuilder.get()
  return ctpClient.create(ctpClient.builder.payments, JSON.parse(paymentDraft))
}

module.exports = { init }
