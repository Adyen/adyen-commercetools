const { executeInAdyenIframe } = require('../e2e-test-utils')

module.exports = class CreditCard3dsNativePage {
  constructor(page, baseUrl) {
    this.page = page
    this.baseUrl = baseUrl
  }

  async getMakePaymentAction() {
    await this.page.waitForTimeout(5_000)
    const makePaymentActionElem = await this.page.$(
      '#adyen-make-payment-response-action-field'
    )
    return this.page.evaluate((el) => el.value, makePaymentActionElem)
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
