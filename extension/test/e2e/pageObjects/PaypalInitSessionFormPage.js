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

    await this.page.waitForTimeout(3_000)
    await this.clickOnPaypalButton()
    // await executeInAdyenIframe(
    //   this.page,
    //   '[data-fieldtype=encryptedCardNumber]',
    //   (el) => el.type(creditCardNumber)
    // )
    //
    // await executeInAdyenIframe(
    //   this.page,
    //   'input[data-fieldtype^=encryptedExpiry]',
    //   (el) => el.type(creditCardDate)
    // )
    //
    // await executeInAdyenIframe(
    //   this.page,
    //   'input[data-fieldtype^=encryptedSecurity]',
    //   (el) => el.type(creditCardCvc)
    // )
    //
    // await this.page.waitForTimeout(2_000)
    // const checkoutButton = await this.page.$('.adyen-checkout__button--pay')
    //
    // await this.page.evaluate((cb) => cb.click(), checkoutButton)
  }

  async clickOnPaypalButton() {
    try {
      // const checkoutButton = await this.page.$('.paypal-button')
      //
      // await this.page.evaluate((cb) => cb.click(), checkoutButton)
      await executeInAdyenIframe(this.page, '.paypal-button', (el) =>
        el.click()
      )
    } catch (err) {
      console.log(err)
    }

    await this.page.waitForTimeout(1_000)
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
