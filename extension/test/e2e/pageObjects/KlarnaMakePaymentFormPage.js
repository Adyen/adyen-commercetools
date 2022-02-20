import MakePaymentFormPage from './MakePaymentFormPage.js'

export default class KlarnaMakePaymentFormPage extends MakePaymentFormPage {
  async getMakePaymentRequest(clientKey) {
    await this.generateAdyenMakePaymentForm(clientKey)
    return this.getMakePaymentRequestTextAreaValue()
  }
}
