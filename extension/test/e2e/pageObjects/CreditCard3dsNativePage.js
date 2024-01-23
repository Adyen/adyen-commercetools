import { executeInAdyenIframe } from '../e2e-test-utils.js'

export default class CreditCard3dsNativePage {
  constructor(page, baseUrl) {
    this.page = page
    this.baseUrl = baseUrl
  }

  async finish3dsNativePayment() {
    await executeInAdyenIframe(this.page, '[name=answer]', (el) =>
      el.type('password'),
    )
    await executeInAdyenIframe(this.page, 'button[type=submit]', (el, frame) =>
      frame.$eval('#buttonSubmit', async (button) => {
        await button.click()
      }),
    )

    await this.page.waitForTimeout(1_000)

    const additionalPaymentDetailsInput2 = await this.page.$(
      '#adyen-additional-payment-details',
    )
    return this.page.evaluate((el) => el.value, additionalPaymentDetailsInput2)
  }
}
