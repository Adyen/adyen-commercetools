module.exports = class MakePaymentFormPage {
  constructor (page, baseUrl) {
    this.page = page
    this.baseUrl = baseUrl
  }

  async goToThisPage () {
    await this.page.goto(`${this.baseUrl}/make-payment-form`)
  }

  async generateAdyenMakePaymentForm (clientKey) {
    await this.page.type('#adyen-client-key', clientKey)
    await this.page.$eval('#adyen-client-key', e => e.blur())
    await this.page.waitForTimeout(3000)
  }

  async getMakePaymentRequestTextAreaValue () {
    await this.page.click('.adyen-checkout__button--pay')
    const makePaymentRequestTextArea = await this.page.$('#adyen-make-payment-request')
    return (await makePaymentRequestTextArea.getProperty('innerHTML')).jsonValue()
  }
}
