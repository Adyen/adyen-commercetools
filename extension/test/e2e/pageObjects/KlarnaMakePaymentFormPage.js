const MakePaymentFormPage = require('./MakePaymentFormPage')

module.exports = class KlarnaMakePaymentFormPage extends MakePaymentFormPage {
  #page

  #baseUrl

  constructor (page, baseUrl) {
    super(page, baseUrl)
    this.#page = page
    this.#baseUrl = baseUrl
  }

  async getMakePaymentRequest ({ getOriginKeysResponse }) {
    await this.generateAdyenMakePaymentForm(getOriginKeysResponse)

    return this.getMakePaymentRequestTextAreaValue()
  }
}
