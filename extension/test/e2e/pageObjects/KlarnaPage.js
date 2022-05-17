export default class KlarnaPage {
  constructor(page) {
    this.page = page
  }

  async finishKlarnaPayment() {
    // Wait for Klarna page being totally loaded
    const klarnaMainFrame = this.page
      .frames()
      .find((f) => f.name() === 'klarna-hpp-instance-main')
    await klarnaMainFrame.waitForSelector('#scheme-payment-selector')
    await this.page.waitForTimeout(2_000)
    await this.page.click('#buy-button')

    await this.processOtpAndPay()
  }

  async processOtpAndPay() {
    const klarnaIframe = this.page
      .frames()
      .find((f) => f.name() === 'klarna-hpp-instance-fullscreen')
    await klarnaIframe.waitForSelector('#onContinue')
    await klarnaIframe.click('#onContinue')

    await klarnaIframe.waitForSelector('#otp_field')
    await klarnaIframe.type('#otp_field', '123456')

    await klarnaIframe.waitForSelector(
      '#invoice_kp-purchase-review-continue-button'
    )
    await klarnaIframe.click('#invoice_kp-purchase-review-continue-button')
  }
}
