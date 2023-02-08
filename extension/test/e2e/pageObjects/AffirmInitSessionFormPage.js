import InitSessionFormPage from './InitSessionFormPage.js'

export default class AffirmInitSessionFormPage extends InitSessionFormPage {
  async initPaymentSession({ clientKey, paymentAfterCreateSession }) {
    await super.initPaymentSession(clientKey, paymentAfterCreateSession)
    await this.pasteValuesInAffirmWebComponent()
    await this.confirmAffirmWebComponent()
  }

  async pasteValuesInAffirmWebComponent() {
    console.log('affirm-web-component-1')
    await this.page.waitForSelector('.adyen-checkout__button--pay') // wait for rendering of web component
    console.log('affirm-web-component-2')
    const adyenCheckoutInputFormElement = await this.page.$(
      '#adyen-payment-form-input'
    )
    console.log('affirm-web-component-3')
    const adyenCheckoutInputForm = await (
      await adyenCheckoutInputFormElement.getProperty('innerHTML')
    ).jsonValue()
    const adyenCheckoutInputFormJSON = JSON.parse(
      adyenCheckoutInputForm.toString()
    )
    console.log('affirm-web-component-4')
    await this.page.type(
      '.adyen-checkout__input--firstName',
      adyenCheckoutInputFormJSON?.shopperName?.firstName
    )
    console.log('affirm-web-component-5')
    await this.page.type(
      '.adyen-checkout__input--lastName',
      adyenCheckoutInputFormJSON?.shopperName?.lastName
    )
    console.log('affirm-web-component-6')
    await this.page.type(
      '.adyen-checkout__input--shopperEmail',
      adyenCheckoutInputFormJSON?.shopperEmail
    )
    console.log('affirm-web-component-7')
    await this.page.type(
      '.adyen-checkout__input--telephoneNumber',
      adyenCheckoutInputFormJSON?.telephoneNumber
    )
    console.log('affirm-web-component-8')
    await this.page.type(
      '.adyen-checkout__input--street',
      adyenCheckoutInputFormJSON?.billingAddress?.street
    )
    console.log('affirm-web-component-9')
    await this.page.type(
      '.adyen-checkout__input--houseNumberOrName',
      adyenCheckoutInputFormJSON?.billingAddress?.houseNumberOrName
    )
    console.log('affirm-web-component-10')
    await this.page.type(
      '.adyen-checkout__input--city',
      adyenCheckoutInputFormJSON?.billingAddress?.city
    )
    await this.page.type(
      '.adyen-checkout__input--postalCode',
      adyenCheckoutInputFormJSON?.billingAddress?.postalCode
    )
    await this.fillDeliveryAddressStateDDL(
      adyenCheckoutInputFormJSON?.billingAddress?.stateCode
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
