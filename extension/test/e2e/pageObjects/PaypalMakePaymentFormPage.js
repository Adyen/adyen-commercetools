import MakePaymentFormPage from './MakePaymentFormPage.js'
import { executeInAdyenIframe } from '../e2e-test-utils.js'

export default class PaypalMakePaymentFormPage extends MakePaymentFormPage {
  async clickOnPaypalButton() {
    await executeInAdyenIframe(this.page, '.paypal-button', (el) => el.click())
  }

  async generateAdyenMakePaymentForm(clientKey, paypalMerchantId) {
    await this.page.type('#paypal-merchant-id', paypalMerchantId)
    await super.generateAdyenMakePaymentForm(clientKey)
  }

  async getAdditionalPaymentDetails() {
    await this.page.waitForSelector('#adyen-additional-payment-details')
    const additionalPaymenDetailsTextArea = await this.page.$(
      '#adyen-additional-payment-details'
    )

    const innerHtml = await additionalPaymenDetailsTextArea.getProperty(
      'innerHTML'
    )
    return await innerHtml.jsonValue()
  }
}
