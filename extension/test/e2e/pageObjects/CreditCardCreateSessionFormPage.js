import { executeInAdyenIframe } from '../e2e-test-utils.js'
import CreateSessionFormPage from './CreateSessionFormPage.js'

export default class CreditCardCreateSessionFormPage extends CreateSessionFormPage {
  async setupComponent({
    clientKey,
    paymentAfterCreateSession,
    creditCardNumber,
    creditCardDate,
    creditCardCvc,
  }) {
    const createSessionFormAliveTimeout = 120_000 // It determines how long the form page stays before termination. Please remember to reset it to 5 seconds after debugging in browser to avoid long idle time in CI/CD

    await this.generateAdyenCreateSessionForm(
      clientKey,
      paymentAfterCreateSession
    )

    await this.page.waitForTimeout(3_000)

    await executeInAdyenIframe(
      this.page,
      '[data-fieldtype=encryptedCardNumber]',
      (el) => el.type(creditCardNumber)
    )

    await executeInAdyenIframe(
      this.page,
      '[data-fieldtype=encryptedExpiryDate]',
      (el) => el.type(creditCardDate)
    )

    await executeInAdyenIframe(
      this.page,
      '[data-fieldtype=encryptedSecurityCode]',
      (el) => el.type(creditCardCvc)
    )
    await this.page.waitForTimeout(createSessionFormAliveTimeout)
    //return this.getInitSessionResultTextAreaValue()
  }
}
