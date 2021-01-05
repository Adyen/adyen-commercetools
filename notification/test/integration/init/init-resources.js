const {
  ensureInterfaceInteractionCustomType,
} = require('../../../src/config/init/ensure-interface-interaction-custom-type')
const { ensurePaymentCustomType } = require('./ensure-payment-custom-type')
const { ensurePayment } = require('./ensure-payment')

async function ensureResources(ctpClient) {
  await ensureInterfaceInteractionCustomType(ctpClient)
  await ensurePaymentCustomType(ctpClient)
  await ensurePayment(ctpClient)
}

module.exports = {
  ensureResources,
}
