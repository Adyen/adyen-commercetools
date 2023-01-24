import InitSessionFormPage from './InitSessionFormPage.js'

export default class KlarnaInitSessionFormPage extends InitSessionFormPage {
  async initPaymentSession({ clientKey, paymentAfterCreateSession }) {
    await super.initPaymentSession(clientKey, paymentAfterCreateSession)
  }
}
