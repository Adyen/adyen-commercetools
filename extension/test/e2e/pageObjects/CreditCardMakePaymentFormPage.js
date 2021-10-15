const { executeInAdyenIframe } = require('../e2e-test-utils')
const MakePaymentFormPage = require('./MakePaymentFormPage')

module.exports = class CreditCardMakePaymentFormPage extends (
  MakePaymentFormPage
) {
  async getMakePaymentRequest({
    creditCardNumber,
    creditCardDate,
    creditCardCvc,
    clientKey,
  }) {
    await this.generateAdyenMakePaymentForm(clientKey)
    await executeInAdyenIframe(this.page, '[data-fieldtype="encryptedCardNumber"]', (el) =>
      el.type(creditCardNumber)
    )
    await executeInAdyenIframe(this.page, '[data-fieldtype="encryptedExpiryDate"]', (el) =>
      el.type(creditCardDate)
    )
    await executeInAdyenIframe(this.page, '[data-fieldtype="encryptedSecurityCode"]', (el) =>
      el.type(creditCardCvc)
    )
    return this.getMakePaymentRequestTextAreaValue()
  }
}
