export default class CreateSessionFormPage {
  constructor(page, baseUrl) {
    this.page = page
    this.baseUrl = baseUrl
  }

  async goToThisPage() {
    await this.page.goto(`${this.baseUrl}/create-session-form`)
  }

  async generateAdyenCreateSessionForm(clientKey, payment) {
    const createSessionFormAliveTimeout = 5_000 // It determines how long the form page stays before termination. Please remember to reset it to 5 seconds after debugging in browser to avoid long idle time in CI/CD

    // Put Adyen API Key into HTML for e2e test
    await this.page.type('#adyen-client-key', clientKey)
    await this.page.$eval('#adyen-client-key', (e) => e.blur())

    // Put Session ID into HTML for e2e test
    let sessionId // TODO Assign session ID by the payment obtained from the response of /session endpoint
    await this.page.type('#adyen-session-id', payment.id)
    await this.page.$eval('#adyen-session-id', (e) => e.blur())

    // Put Session ID into HTML for e2e test
    let sessionData // TODO Assign session data by the payment obtained from the response of /session endpoint
    await this.page.type('#adyen-session-data', payment.sessionData)
    await this.page.$eval('#adyen-session-data', (e) => e.blur())

    await this.page.waitForTimeout(createSessionFormAliveTimeout)
  }

  async getInitSessionResultTextAreaValue() {
    // TODO : Check the checkout buttom ID from the DOM element and see if it can be actually clicked.
    await this.page.click('.adyen-checkout__button--pay')
    const initSessionResultTextArea = await this.page.$(
      '#adyen-init-session-result'
    )
    return (
      await initSessionResultTextArea.getProperty('innerHTML')
    ).jsonValue()
  }
}
