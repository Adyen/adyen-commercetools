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
    await this.confirmCreditCardWebComponent()
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
    await encryptedCardNumberFrame.waitForSelector(
      '[data-fieldtype="encryptedCardNumber"]',
      { timeout: 10000 },
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

  async confirmCreditCardWebComponent() {
    await this.page.waitForSelector(
      '.adyen-checkout__button.adyen-checkout__button--pay',
      {
        timeout: 3000,
      },
    )

    const checkoutButton = await this.page.$(
      '.adyen-checkout__button.adyen-checkout__button--pay',
    )
    if (!checkoutButton) {
      throw new Error('Checkout button not found')
    }

    await checkoutButton.click()
  }

  async getPaymentAuthResult() {
    const authResultEle = await this.page.$('#adyen-payment-auth-result')
    await new Promise((resolve) => {
      setTimeout(resolve, 2000)
    })
    const authResultJson = await (
      await authResultEle.getProperty('innerHTML')
    ).jsonValue()

    return authResultJson
  }
}
