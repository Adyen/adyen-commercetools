import testUtils from '../e2e-test-utils'
import httpUtils from '../../../src/utils'

const { pasteValue } = testUtils
const logger = httpUtils.getLogger()

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
