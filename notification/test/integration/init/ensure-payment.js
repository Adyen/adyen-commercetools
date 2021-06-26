const payment = require('../../resources/payment-draft.json')

async function ensurePayment(ctpClient) {
  await ctpClient.create(ctpClient.builder.payments, payment)
}

module.exports = {
  ensurePayment,
}
