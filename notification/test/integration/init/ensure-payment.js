const _ = require('lodash')
const payment = require('../../resources/payment-draft.json')

function ensurePayment(
  ctpClient,
  paymentKey,
  commercetoolsProjectKey,
  adyenMerchantAccount
) {
  const paymentDraft = _.cloneDeep(payment)
  paymentDraft.key = paymentKey
  paymentDraft.custom.fields = {
    commercetoolsProjectKey,
    adyenMerchantAccount,
  }

  return ctpClient.create(ctpClient.builder.payments, paymentDraft)
}

module.exports = {
  ensurePayment,
}
