const paymentCustomType = require('../../../resources/payment-custom-types.json')

async function ensurePaymentCustomType (ctpClient) {
  try {
    const { body } = await ctpClient.fetch(ctpClient.builder.types.where(`key="${paymentCustomType.key}"`))
    if (body.results.length === 0)
      await ctpClient.create(ctpClient.builder.types, paymentCustomType)
  } catch (e) {
    console.error('Error when creating payment custom type, skipping...', JSON.stringify(e))
  }
}

module.exports = {
  ensurePaymentCustomType
}
