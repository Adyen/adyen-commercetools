import MakePaymentFormPage from "./MakePaymentFormPage.js";
import {executeInAdyenIframe} from "../e2e-test-utils.js";

export default class PaypalMakePaymentFormPage extends MakePaymentFormPage {

  async clickOnPaypalButton() {
    await executeInAdyenIframe(this.page, '.paypal-button', (el) =>
      el.click()
    )
  }

}
