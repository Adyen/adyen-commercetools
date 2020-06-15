module.exports = class MakePaymentFormPage {
  constructor (page, baseUrl) {
    this.page = page
    this.baseUrl = baseUrl
  }

  async goToThisPage () {
    await this.page.goto(`${this.baseUrl}/make-payment-form`)
  }

  async generateAdyenMakePaymentForm (getOriginKeysResponse) {
    await this.page.type('#adyen-origin-key', getOriginKeysResponse.originKeys[this.baseUrl])
    await this.page.$eval('#adyen-origin-key', e => e.blur())
    await this.page.waitFor(3000)
  }

  async getMakePaymentRequestTextAreaValue () {
    await this.page.click('.adyen-checkout__button--pay')
    const makePaymentRequestTextArea = await this.page.$('#adyen-make-payment-request')
    return (await makePaymentRequestTextArea.getProperty('innerHTML')).jsonValue()
  }
}
