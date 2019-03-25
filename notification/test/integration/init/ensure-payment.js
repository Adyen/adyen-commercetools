const payment = require('../../resources/payment-draft')

async function ensurePayment (ctpClient) {
  await ctpClient.create(ctpClient.builder.payments, payment)
}

module.exports = {
  ensurePayment
}
