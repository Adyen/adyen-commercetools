export default class CreditCardNativeAuthenticationPage {
  constructor(page, baseUrl) {
    this.page = page
    this.baseUrl = baseUrl
  }

  async doPaymentAuthentication() {
    let frameWithPasswordInput
    // Get the nested iFrame for 3DS authentication
    for (const frame of this.page.mainFrame().childFrames()) {
      for (const subFrame of frame.childFrames()) {
        frameWithPasswordInput = subFrame
      }
    }

    const passwordInputEle = await frameWithPasswordInput.$('[name=answer]')

    if (passwordInputEle) {
      await passwordInputEle.type('password')
    }
    const submitButtonEle = await frameWithPasswordInput.$(
      'button[type=submit]',
    )
    if (submitButtonEle) {
      await submitButtonEle.click()
    }
  }
}
