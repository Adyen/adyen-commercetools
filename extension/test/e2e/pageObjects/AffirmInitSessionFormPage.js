import CreateSessionFormPage from './CreateSessionFormPage.js'

export default class AffirmInitSessionFormPage extends CreateSessionFormPage {
  async initPaymentSession({ clientKey, paymentAfterCreateSession }) {
    await this.generateAdyenCreateSessionForm(
      clientKey,
      paymentAfterCreateSession
    )

    await this.pasteValuesInAffirmWebComponent()

    await this.getInitSessionResultTextAreaValue()
    // return await this.getPaymentAuthResult()
    // return this.getCreateSessionRequestTextAreaValue()
  }

  async pasteValuesInAffirmWebComponent() {
    await this.page.waitForSelector('.adyen-checkout__input--firstName')
    const createSessionInputFormElement = await this.page.$(
      '#adyen-payment-form-input'
    )
    const createSessionInputForm = await (
      await createSessionInputFormElement.getProperty('innerHTML')
    ).jsonValue()
    const createSessionInputFormJSON = JSON.parse(
      createSessionInputForm.toString()
    )

    await this.page.type(
      '.adyen-checkout__input--firstName',
      createSessionInputFormJSON?.shopperName?.firstName
    )
    await this.page.type(
      '.adyen-checkout__input--lastName',
      createSessionInputFormJSON?.shopperName?.lastName
    )
    await this.page.type(
      '.adyen-checkout__input--shopperEmail',
      createSessionInputFormJSON?.shopperEmail
    )
    await this.page.type(
      '.adyen-checkout__input--telephoneNumber',
      createSessionInputFormJSON?.telephoneNumber
    )

    await this.page.type(
      '.adyen-checkout__input--street',
      createSessionInputFormJSON?.billingAddress?.street
    )
    await this.page.type(
      '.adyen-checkout__input--houseNumberOrName',
      createSessionInputFormJSON?.billingAddress?.houseNumberOrName
    )
    await this.page.type(
      '.adyen-checkout__input--city',
      createSessionInputFormJSON?.billingAddress?.city
    )
    await this.page.type(
      '.adyen-checkout__input--postalCode',
      createSessionInputFormJSON?.billingAddress?.postalCode
    )
    await this.fillDeliveryAddressStateDDL(
      createSessionInputFormJSON?.billingAddress?.stateCode
    )
    // await this.page.waitForTimeout(2_000)
    // const checkoutButton = await this.page.$('.adyen-checkout__button--pay')
    //
    // await this.page.evaluate((cb) => cb.click(), checkoutButton)
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

  async getInitSessionResultTextAreaValue() {
    await this.page.waitForSelector('.adyen-checkout__button--pay')
    await this.page.click('.adyen-checkout__button--pay')
  }

  async getPaymentAuthResult() {
    const authResultEle = await this.page.$('#adyen-payment-auth-result')
    await this.page.waitForTimeout(2_000)
    const authResultJson = await (
      await authResultEle.getProperty('innerHTML')
    ).jsonValue()
    console.log(authResultJson)
    return authResultJson
  }
}
