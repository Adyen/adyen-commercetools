import { executeInAdyenIframe } from '../e2e-test-utils.js'
import InitSessionFormPage from './InitSessionFormPage.js'

export default class PaypalInitSessionFormPage extends InitSessionFormPage {
  async initPaymentSession({
    clientKey,
    paymentAfterCreateSession,
    paypalMerchantId,
  }) {
    await this.page.waitForSelector('#paypal-merchant-id')
    await this.page.type('#paypal-merchant-id', paypalMerchantId)
    await super.initPaymentSession(clientKey, paymentAfterCreateSession)
    await this.page.waitForTimeout(4_000)
    await this.clickOnPaypalButton()
  }

  async clickOnPaypalButton() {
    await executeInAdyenIframe(this.page, '.paypal-button', (el) => el.click())
    await this.page.waitForTimeout(1_000)
  }

  async getPaymentAuthResult() {
    await this.page.waitForTimeout(5_000) // wait for the main page refreshing
    await this.page.waitForSelector('#adyen-payment-auth-result') // make sure result has been redenered in main page
    const authResultEle = await this.page.$('#adyen-payment-auth-result')

    const authResultJson = await (
      await authResultEle.getProperty('innerHTML')
    ).jsonValue()

    return authResultJson
  }
}
