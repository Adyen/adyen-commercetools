const MakePaymentFormPage = require('./MakePaymentFormPage')

module.exports = class KlarnaMakePaymentFormPage extends MakePaymentFormPage {
  async getMakePaymentRequest (clientKey) {
    await this.generateAdyenMakePaymentForm(clientKey)
    return this.getMakePaymentRequestTextAreaValue()
  }
}
