module.exports = class KlarnaPage {
  constructor(page) {
    this.page = page
  }

  async finishKlarnaPayment() {
    // Wait for Klarna page being totally loaded
    const klarnaMainFrame = this.page
      .frames()
      .find((f) => f.name() === 'klarna-hpp-instance-main')
    await klarnaMainFrame.waitForSelector('#scheme-payment-selector')
    return this.page.click('#buy-button')
  }
}
