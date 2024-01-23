export default class MakePaymentFormPage {
  constructor(page, baseUrl) {
    this.page = page
    this.baseUrl = baseUrl
  }

  async goToThisPage() {
    await this.page.goto(`${this.baseUrl}/make-payment-form`)
  }

  async generateAdyenMakePaymentForm(clientKey) {
    await this.page.waitForSelector('#adyen-client-key')

    // Put Adyen API Key into HTML for e2e test

    await this.page.type('#adyen-client-key', clientKey)
    await this.page.$eval('#adyen-client-key', (e) => e.blur())
  }

  async getMakePaymentRequestTextAreaValue() {
    await this.page.waitForSelector('.adyen-checkout__button--pay')
    await this.page.click('.adyen-checkout__button--pay')

    const makePaymentRequestTextArea = await this.page.$(
      '#adyen-make-payment-request',
    )
    return (
      await makePaymentRequestTextArea.getProperty('innerHTML')
    ).jsonValue()
  }
}
