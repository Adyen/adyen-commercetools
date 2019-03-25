const { ensureInterfaceInteractionCustomType } = require('./ensure-interface-interaction-custom-type')
const { ensurePayment } = require('./ensure-payment')

async function ensureResources (ctpClient) {
  await ensureInterfaceInteractionCustomType(ctpClient)
  await ensurePayment(ctpClient)
}

module.exports = {
  ensureResources
}
