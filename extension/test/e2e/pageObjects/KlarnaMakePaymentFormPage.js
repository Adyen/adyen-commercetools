const MakePaymentFormPage = require('./MakePaymentFormPage')

module.exports = class KlarnaMakePaymentFormPage extends MakePaymentFormPage {
  async getMakePaymentRequest ({ getOriginKeysResponse }) {
    await this.generateAdyenMakePaymentForm(getOriginKeysResponse)
    return this.getMakePaymentRequestTextAreaValue()
  }
}
