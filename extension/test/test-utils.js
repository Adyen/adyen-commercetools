global.window = {}
global.navigator = {}

const Promise = require('bluebird')
const adyenEncrypt = require('adyen-cse-js')
const _ = require('lodash')

const creditCardTpl = require('./fixtures/payment-credit-card.json')
const creditCard3dTpl = require('./fixtures/payment-credit-card-3d.json')

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason)
  process.exit(1)
})

function deleteResource (ctpClient, endpoint, item) {
  const uri = ctpClient.builder[endpoint]
  return ctpClient.delete(uri, item.id, item.version)
}

async function unpublish (ctpClient, product) {
  const uri = ctpClient.builder.products
  const actions = [{
    action: 'unpublish'
  }]
  const res = await ctpClient.update(uri, product.id, product.version, actions)
  return res.body
}

function deleteAllResources (ctpClient, endpoint, condition) {
  let requestBuilder = ctpClient.builder[endpoint]

  if (condition)
    requestBuilder = requestBuilder.where(condition)

  return ctpClient.fetchBatches(requestBuilder,
    items => Promise.map(items, async (item) => {
      if (endpoint === 'products' && item.masterData.published)
        item = await unpublish(ctpClient, item)

      return deleteResource(ctpClient, endpoint, item)
    }, { concurrency: 10 }))
}

function createCreditCardPaymentDraft ({
  cardNumber, cvc, expiryMonth, expiryYear,
  returnUrl, paymentTemplate = creditCardTpl
}) {
  const key = process.env.CLIENT_ENCRYPTION_PUBLIC_KEY

  const cseInstance = adyenEncrypt.createEncryption(key, {})

  const encryptedCardNumber = cseInstance.encrypt({
    number: cardNumber,
    generationtime: new Date().toISOString()
  })
  const encryptedSecurityCode = cseInstance.encrypt({
    cvc,
    generationtime: new Date().toISOString()
  })
  const encryptedExpiryMonth = cseInstance.encrypt({
    expiryMonth,
    generationtime: new Date().toISOString()
  })
  const encryptedExpiryYear = cseInstance.encrypt({
    expiryYear,
    generationtime: new Date().toISOString()
  })
  return _.template(JSON.stringify(paymentTemplate))({
    encryptedCardNumber,
    encryptedSecurityCode,
    encryptedExpiryMonth,
    encryptedExpiryYear,
    returnUrl
  })
}

function createCreditCard3DSPaymentDraft ({
  cardNumber, cvc, expiryMonth, expiryYear, returnUrl
}) {
  return createCreditCardPaymentDraft({
    cardNumber,
    cvc,
    expiryMonth,
    expiryYear,
    returnUrl,
    paymentTemplate: creditCard3dTpl
  })
}

module.exports = {
  createCreditCardPaymentDraft,
  createCreditCard3DSPaymentDraft,
  unpublish,
  deleteAllResources
}
