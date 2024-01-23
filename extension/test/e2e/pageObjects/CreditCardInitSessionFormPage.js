import { executeInAdyenIframe } from '../e2e-test-utils.js'
import InitSessionFormPage from './InitSessionFormPage.js'

export default class CreditCardInitSessionFormPage extends InitSessionFormPage {
  async initPaymentSession({
    clientKey,
    paymentAfterCreateSession,
    creditCardNumber,
    creditCardDate,
    creditCardCvc,
  }) {
    await super.initPaymentSession(clientKey, paymentAfterCreateSession)
    await this.pasteValuesInCreditCardWebComponent(
      creditCardNumber,
      creditCardDate,
      creditCardCvc,
    )
    await this.confirmCreditCardWebComopnent()
  }

  async pasteValuesInCreditCardWebComponent(
    creditCardNumber,
    creditCardDate,
    creditCardCvc,
  ) {
    const elementHandle = await this.page.waitForSelector(
      '[data-cse="encryptedCardNumber"] iframe',
    )
    const encryptedCardNumberFrame = await elementHandle.contentFrame()

    // For some reason following selector won't work unless we wait
    await encryptedCardNumberFrame.waitForTimeout(10_000)
    await encryptedCardNumberFrame.waitForSelector(
      '[data-fieldtype=encryptedCardNumber]',
    )

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
  }

  async confirmCreditCardWebComopnent() {
    await this.page.waitForTimeout(2_000)
    await this.page.waitForSelector('.adyen-checkout__button--pay')
    const checkoutButton = await this.page.$('.adyen-checkout__button--pay')

    await this.page.evaluate((cb) => cb.click(), checkoutButton)
  }

  async getPaymentAuthResult() {
    const authResultEle = await this.page.$('#adyen-payment-auth-result')
    await this.page.waitForTimeout(2_000)
    const authResultJson = await (
      await authResultEle.getProperty('innerHTML')
    ).jsonValue()

    return authResultJson
  }
}
