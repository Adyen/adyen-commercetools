const {
  ensureInterfaceInteractionCustomTypeForAllProjects,
} = require('../../../src/config/init/ensure-interface-interaction-custom-type')
const { ensurePaymentCustomType } = require('./ensure-payment-custom-type')
const { ensurePayment } = require('./ensure-payment')

async function ensureResources(ctpClient) {
  await ensureInterfaceInteractionCustomTypeForAllProjects()
  await ensurePaymentCustomType(ctpClient)
  await ensurePayment(ctpClient)
}

module.exports = {
  ensureResources,
}
