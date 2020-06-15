const { executeInAdyenIframe } = require('../e2e-test-utils')
const MakePaymentFormPage = require('./MakePaymentFormPage')

module.exports = class CreditCardMakePaymentFormPage extends MakePaymentFormPage {
  async goToThisPage () {
    await this.page.goto(`${this.baseUrl}/make-payment-form`)
  }

  async getMakePaymentRequest ({
                                 getOriginKeysResponse,
                                 creditCardNumber, creditCardDate, creditCardCvc
                               }) {
    await this.generateAdyenMakePaymentForm(getOriginKeysResponse)
    await executeInAdyenIframe(this.page, '#encryptedCardNumber', el => el.type(creditCardNumber))
    await executeInAdyenIframe(this.page, '#encryptedExpiryDate', el => el.type(creditCardDate))
    await executeInAdyenIframe(this.page, '#encryptedSecurityCode', el => el.type(creditCardCvc))
    return this.getMakePaymentRequestTextAreaValue()
  }
}
