const paymentCustomType = require('../../resources/payment-custom-types.json')

async function ensurePaymentCustomType (ctpClient) {
  try {
    await ctpClient.create(ctpClient.builder.types, paymentCustomType)
  } catch (e) {
    console.error('Error when creating payment custom type, skipping...', JSON.stringify(e))
  }
}

module.exports = {
  initPaymentCustomType: ensurePaymentCustomType
}
