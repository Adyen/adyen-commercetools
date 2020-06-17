const { pasteValue } = require('../e2e-test-utils')

module.exports = class RedirectPaymentFormPage {
  constructor (page) {
    this.page = page
    this.baseUrl = process.env.API_EXTENSION_BASE_URL // todo: use config loader.
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
