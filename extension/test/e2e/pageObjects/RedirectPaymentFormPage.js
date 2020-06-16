const { pasteValue } = require('../e2e-test-utils')

module.exports = class RedirectPaymentFormPage {
  constructor (page, baseUrl) {
    this.page = page
    this.baseUrl = baseUrl
  }

  async goToThisPage () {
    await this.page.goto(`${this.baseUrl}/redirect-payment-form`)
  }

  async redirectToAdyenPaymentPage (getOriginKeysResponse, paymentDetailsResponse) {
    await pasteValue(this.page, '#adyen-origin-key', getOriginKeysResponse.originKeys[this.baseUrl])
    await pasteValue(this.page, '#adyen-make-payment-response-action-field',
      JSON.stringify(paymentDetailsResponse.action))
    return this.page.click('#redirect-payment-button')
  }
}
