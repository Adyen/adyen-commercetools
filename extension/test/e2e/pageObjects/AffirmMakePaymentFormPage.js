const MakePaymentFormPage = require('./MakePaymentFormPage')

module.exports = class AffirmMakePaymentFormPage extends MakePaymentFormPage {
  async getMakePaymentRequest(clientKey) {
    await this.generateAdyenMakePaymentForm(clientKey)
    await this.pasteValuesInAdyenMakePaymentForm()
    return this.getMakePaymentRequestTextAreaValue()
  }

  async pasteValuesInAdyenMakePaymentForm() {
    const makePaymentInputFormElement = await this.page.$(
      '#adyen-payment-form-input'
    )
    const makePaymentInputForm = await (
      await makePaymentInputFormElement.getProperty('innerHTML')
    ).jsonValue()
    const makePaymentInputFormJSON = JSON.parse(makePaymentInputForm.toString())

    await this.page.type(
      '.adyen-checkout__input--firstName',
      makePaymentInputFormJSON?.shopperName?.firstName
    )
    await this.page.type(
      '.adyen-checkout__input--lastName',
      makePaymentInputFormJSON?.shopperName?.lastName
    )
    await this.page.type(
      '.adyen-checkout__input--shopperEmail',
      makePaymentInputFormJSON?.shopperEmail
    )
    await this.page.type(
      '.adyen-checkout__input--telephoneNumber',
      makePaymentInputFormJSON?.telephoneNumber
    )

    await this.page.type(
      '.adyen-checkout__input--street',
      makePaymentInputFormJSON?.billingAddress?.street
    )
    await this.page.type(
      '.adyen-checkout__input--houseNumberOrName',
      makePaymentInputFormJSON?.billingAddress?.houseNumberOrName
    )
    await this.page.type(
      '.adyen-checkout__input--city',
      makePaymentInputFormJSON?.billingAddress?.city
    )
    await this.page.type(
      '.adyen-checkout__input--postalCode',
      makePaymentInputFormJSON?.billingAddress?.postalCode
    )
    await this.fillDeliveryAddressStateDDL(
      makePaymentInputFormJSON?.billingAddress?.stateCode
    )
    await this.page.waitForSelector('#adyen-make-payment-request')
  }

  async fillDeliveryAddressStateDDL(stateCodeInput) {
    const deliveryAddressStateElemList = await this.page.$$(
      '.adyen-checkout__dropdown__list'
    )
    const deliveryAddressStateElem = deliveryAddressStateElemList[1]
    const deliveryAddressStateOptions = await deliveryAddressStateElem.$$(
      '.adyen-checkout__dropdown__element'
    )
    deliveryAddressStateOptions.map(async (el) => {
      // const elem = e1
      await el.evaluate((item, selectedStateCode) => {
        const stateCode = item.getAttribute('data-value')
        if (stateCode === selectedStateCode) item.click()
      }, stateCodeInput)
    })
  }

  async getMakePaymentRequestTextAreaValue() {
    await this.page.waitForTimeout(1_000) // suspend 1 second to wait for readiness of makePaymentRequest value in textbox
    const makePaymentRequestTextArea = await this.page.$(
      '#adyen-make-payment-request'
    )
    return (
      await makePaymentRequestTextArea.getProperty('innerHTML')
    ).jsonValue()
  }
}
