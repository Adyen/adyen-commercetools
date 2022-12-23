import { executeInAdyenIframe } from '../e2e-test-utils.js'
import CreateSessionFormPage from './CreateSessionFormPage'

export default class CreditCardMakePaymentFormPage extends CreateSessionFormPage {
  async getCreateSessionRequest({
    creditCardNumber,
    creditCardDate,
    creditCardCvc,
    clientKey,
  }) {
    await this.generateAdyenCreateSessionForm(clientKey)
    await executeInAdyenIframe(this.page, '#encryptedCardNumber', (el) =>
      el.type(creditCardNumber)
    )
    await executeInAdyenIframe(this.page, '#encryptedExpiryDate', (el) =>
      el.type(creditCardDate)
    )
    await executeInAdyenIframe(this.page, '#encryptedSecurityCode', (el) =>
      el.type(creditCardCvc)
    )
    return this.getCreateSessionRequestTextAreaValue()
  }
}
