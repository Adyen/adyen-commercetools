import InitSessionFormPage from './InitSessionFormPage.js'

export default class AffirmInitSessionFormPage extends InitSessionFormPage {
  async initPaymentSession({ clientKey, paymentAfterCreateSession }) {
    await super.initPaymentSession(clientKey, paymentAfterCreateSession)
    await this.pasteValuesInAffirmWebComponent()
    await this.confirmAffirmWebComponent()
  }

  async pasteValuesInAffirmWebComponent() {
    await this.page.waitForSelector('.adyen-checkout__button--pay') // wait for rendering of web component

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

  async confirmAffirmWebComponent() {
    await this.page.waitForTimeout(2_000) // wait for the form has been filled before checkout
    const checkoutButton = await this.page.$('.adyen-checkout__button--pay')
    await this.page.evaluate((cb) => cb.click(), checkoutButton)
  }
}
