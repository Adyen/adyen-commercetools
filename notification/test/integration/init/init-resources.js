const {
  ensureInterfaceInteractionCustomTypeForAllProjects,
} = require('../../../src/config/init/ensure-interface-interaction-custom-type')
const { ensurePaymentCustomType } = require('./ensure-payment-custom-type')

async function ensureResources(ctpClient) {
  await ensureInterfaceInteractionCustomTypeForAllProjects()
  await ensurePaymentCustomType(ctpClient)
}

module.exports = {
  ensureResources,
}
