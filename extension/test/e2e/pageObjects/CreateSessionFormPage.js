export default class CreateSessionFormPage {
  constructor(page, baseUrl) {
    this.page = page
    this.baseUrl = baseUrl
  }

  async goToThisPage() {
    await this.page.goto(`${this.baseUrl}/create-session-form`)
  }

  async generateAdyenCreateSessionForm(clientKey) {
    await this.page.type('#adyen-client-key', clientKey)
    await this.page.$eval('#adyen-client-key', (e) => e.blur())
    await this.page.waitForTimeout(2_000)
  }

  async getCreateSessionRequestTextAreaValue() {
    await this.page.click('.adyen-checkout__button--pay')
    const createSessionRequestTextArea = await this.page.$(
      '#adyen-create-session-request'
    )
    return (
      await createSessionRequestTextArea.getProperty('innerHTML')
    ).jsonValue()
  }
}
