import { executeInAdyenIframe } from '../e2e-test-utils.js'
import MakePaymentFormPage from './MakePaymentFormPage.js'

export default class CreditCardMakePaymentFormPage extends MakePaymentFormPage {
  async getMakePaymentRequest({
    creditCardNumber,
    creditCardDate,
    creditCardCvc,
    clientKey,
  }) {
    await this.generateAdyenMakePaymentForm(clientKey)

    await this.page.waitForTimeout(2_000) // wait for web component rendering

    await executeInAdyenIframe(
      this.page,
      '[data-fieldtype=encryptedCardNumber]',
      (el) => el.type(creditCardNumber),
    )
    await executeInAdyenIframe(
      this.page,
      'input[data-fieldtype^=encryptedExpiry]',
      (el) => el.type(creditCardDate),
    )
    await executeInAdyenIframe(
      this.page,
      'input[data-fieldtype^=encryptedSecurity]',
      (el) => el.type(creditCardCvc),
    )

    return this.getMakePaymentRequestTextAreaValue()
  }
}
