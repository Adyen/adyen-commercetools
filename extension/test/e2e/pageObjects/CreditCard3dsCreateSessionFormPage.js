import { executeInAdyenIframe } from '../e2e-test-utils.js'
import CreateSessionFormPage from './CreateSessionFormPage.js'

export default class CreditCard3dsCreateSessionFormPage extends CreateSessionFormPage {
  async initPaymentSession({
    clientKey,
    paymentAfterCreateSession,
    creditCardNumber,
    creditCardDate,
    creditCardCvc,
  }) {
    await this.generateAdyenCreateSessionForm(
      clientKey,
      paymentAfterCreateSession
    )

    await this.page.waitForTimeout(2_000)

    await executeInAdyenIframe(
      this.page,
      '[data-fieldtype=encryptedCardNumber]',
      (el) => el.type(creditCardNumber)
    )

    await executeInAdyenIframe(
      this.page,
      'input[data-fieldtype^=encryptedExpiry]',
      (el) => el.type(creditCardDate)
    )

    await executeInAdyenIframe(
      this.page,
      'input[data-fieldtype^=encryptedSecurity]',
      (el) => el.type(creditCardCvc)
    )

    await this.page.waitForTimeout(2_000)
    const checkoutButton = await this.page.$('.adyen-checkout__button--pay')

    await this.page.evaluate((cb) => cb.click(), checkoutButton)
  }
}
