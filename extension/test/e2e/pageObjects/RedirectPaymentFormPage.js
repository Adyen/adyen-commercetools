import { pasteValue, getRequestParams } from '../e2e-test-utils.js'
import httpUtils from '../../../src/utils.js'

const logger = httpUtils.getLogger()

export default class RedirectPaymentFormPage {
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

    // TODO :
    //  1. Get returnUrl from paymentDetailsResponse
    //  2. Extract session ID and redirect result from URL parameters
    //  3. Paste the session ID and redirectResult to HTML input textbox
    const url = paymentDetailsResponse.returnUrl
    const params = getRequestParams(url)
    const sessionId = params.sessionId
    const redirectResult = params.redirectResult

    await pasteValue(this.page, '#adyen-redirect-session-id', sessionId)
    await pasteValue(this.page, '#adyen-redirect-result', redirectResult)
    return this.page.click('#redirect-payment-button')
  }
}
