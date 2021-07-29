const MakePaymentFormPage = require('./MakePaymentFormPage')

module.exports = class AffirmMakePaymentFormPage extends MakePaymentFormPage {
  async getMakePaymentRequest(clientKey) {
    await this.generateAdyenMakePaymentForm(clientKey)
    await this.pasteValuesInAdyenMakePaymentForm()
    return this.getMakePaymentRequestTextAreaValue()
  }

  async pasteValuesInAdyenMakePaymentForm() {
    await this.page.type('.adyen-checkout__input--firstName', 'firstName')
    await this.page.type('.adyen-checkout__input--lastName', 'lastName')
    await this.page.type(
      '.adyen-checkout__input--shopperEmail',
      'test@test.com'
    )
    await this.page.type(
      '.adyen-checkout__input--telephoneNumber',
      '+491725554479'
    )
    await this.page.type('.adyen-checkout__input--street', 'Apple Street')
    await this.page.type('.adyen-checkout__input--houseNumberOrName', '9')
    await this.page.type('.adyen-checkout__input--city', 'New York')
    await this.page.type('.adyen-checkout__input--postalCode', '88888')
    await this.fillDeliveryAddressStateDDL()
    await this.page.waitForTimeout(5_000)
  }

  async fillDeliveryAddressStateDDL() {
    const deliveryAddressStateElemList = await this.page.$$(
      '.adyen-checkout__dropdown__list'
    )
    const deliveryAddressStateElem = deliveryAddressStateElemList[1]
    const deliveryAddressStateOptions = await deliveryAddressStateElem.$$(
      '.adyen-checkout__dropdown__element'
    )
    deliveryAddressStateOptions.map(async (e1) => {
      await e1.evaluate((item) => {
        const stateCode = item.getAttribute('data-value')
        if (stateCode === 'NY') item.click()
      })
    })
  }

  async getMakePaymentRequestTextAreaValue() {
    const makePaymentRequestTextArea = await this.page.$(
      '#adyen-make-payment-request'
    )
    return (
      await makePaymentRequestTextArea.getProperty('innerHTML')
    ).jsonValue()
  }
}
