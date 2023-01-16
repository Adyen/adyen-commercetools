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

  async redirectToAdyenPaymentPage(adyenClientKey, sessionId, redirectResult) {
    await pasteValue(this.page, '#adyen-client-key', adyenClientKey)
    await pasteValue(this.page, '#adyen-redirect-session-id', sessionId)
    await pasteValue(this.page, '#adyen-redirect-result', redirectResult)

    await this.page.click('#redirect-payment-button')
    await this.page.waitForTimeout(1_000)
    const redirectResultCodeEle = await this.page.$(
      '#adyen-payment-auth-result'
    )
    return await this.page.evaluate((el) => el.value, redirectResultCodeEle)
  }
}
