const { pasteValue } = require('../e2e-test-utils')

const httpUtils = require('../../../src/utils')

const logger = httpUtils.getLogger()

module.exports = class RedirectPaymentFormPage {
  constructor(page, baseUrl) {
    this.page = page
    this.baseUrl = baseUrl
  }

  async goToThisPage() {
    await this.page.goto(`${this.baseUrl}/redirect-payment-form`)
  }

  async redirectToAdyenPaymentPage(paymentDetailsResponse) {
    logger.debug(
      'redirectToAdyenPaymentPage::paymentDetailsResponse::',
      paymentDetailsResponse
    )
    await pasteValue(
      this.page,
      '#adyen-make-payment-response-action-field',
      JSON.stringify(paymentDetailsResponse.action)
    )
    return this.page.click('#redirect-payment-button')
  }
}
