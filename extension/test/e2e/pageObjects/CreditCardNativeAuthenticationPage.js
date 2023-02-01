import { executeInAdyenIframe } from '../e2e-test-utils.js'

export default class CreditCardNativeAuthenticationPage {
  constructor(page, baseUrl) {
    this.page = page
    this.baseUrl = baseUrl
  }

  async doPaymentAuthentication() {
    await executeInAdyenIframe(this.page, '[name=answer]', (el) =>
      el.type('password')
    )

    await executeInAdyenIframe(this.page, 'button[type=submit]', (el, frame) =>
      frame.$eval('#buttonSubmit', async (button) => {
        await button.click()
      })
    )
  }
}
