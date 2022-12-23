// import { executeInAdyenIframe } from '../e2e-test-utils.js'
import CreateSessionFormPage from './CreateSessionFormPage.js'

export default class CreditCardCreateSessionFormPage extends CreateSessionFormPage {
  async setupComponent({ clientKey, paymentAfterCreateSession }) {
    await this.generateAdyenCreateSessionForm(
      clientKey,
      paymentAfterCreateSession
    )

    // TODO : Check if we still need to input credit card details in iFrame after setupComponent
    // await executeInAdyenIframe(this.page, '#encryptedCardNumber', (el) =>
    //     el.type(creditCardNumber)
    // )
    // await executeInAdyenIframe(this.page, '#encryptedExpiryDate', (el) =>
    //     el.type(creditCardDate)
    // )
    // await executeInAdyenIframe(this.page, '#encryptedSecurityCode', (el) =>
    //     el.type(creditCardCvc)
    // )

    return this.getInitSessionResultTextAreaValue()
  }
}
