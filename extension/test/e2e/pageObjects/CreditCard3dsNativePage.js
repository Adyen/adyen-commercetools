const { executeInAdyenIframe } = require('../e2e-test-utils')

module.exports = class CreditCard3dsNativePage {
  constructor(page, baseUrl) {
    this.page = page
    this.baseUrl = baseUrl
  }

  async finish3dsNativePayment() {
    await executeInAdyenIframe(this.page, '[name=answer]', (el) =>
      el.type('password')
    )
    await executeInAdyenIframe(this.page, '.button--primary', (el) =>
      el.click()
    )

    await this.page.waitForTimeout(20_000)

    const additionalPaymentDetailsInput2 = await this.page.$(
      '#adyen-additional-payment-details'
    )
    return this.page.evaluate((el) => el.value, additionalPaymentDetailsInput2)
  }
}
