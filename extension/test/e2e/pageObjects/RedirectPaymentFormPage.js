import testUtils from '../e2e-test-utils.js'
import httpUtils from '../../../src/utils.js'

const logger = httpUtils.getLogger()
const { pasteValue } = testUtils

export default class RedirectPaymentFormPage {
  constructor(page, baseUrl) {
    this.page = page
    this.baseUrl = baseUrl
  }

  async goToThisPage() {
    await this.page.goto(`${this.baseUrl}/redirect-payment-form`)
  }

  async redirectToAdyenPaymentPage(paymentDetailsResponse, clientKey) {
    logger.debug(
      'redirectToAdyenPaymentPage::paymentDetailsResponse::',
      paymentDetailsResponse
    )
    await pasteValue(
      this.page,
      '#adyen-make-payment-response-action-field',
      JSON.stringify(paymentDetailsResponse.action)
    )

    await pasteValue(this.page, '#adyen-client-key', clientKey)
    return this.page.click('#redirect-payment-button')
  }
}
