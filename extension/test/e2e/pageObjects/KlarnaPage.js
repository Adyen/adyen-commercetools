module.exports = class KlarnaPage {
  constructor(page) {
    this.page = page
  }

  async finishKlarnaPayment() {
    // Wait for Klarna page being totally loaded
    const klarnaMainFrame = this.page
      .frames()
      .find((f) => f.name() === 'klarna-hpp-instance-main')
    await klarnaMainFrame.waitForSelector('#payment-method-selector')

    await this.page.click('#buy-button')
    const confirmationFrame = this.page
      .frames()
      .find((f) => f.name() === 'klarna-hpp-instance-fullscreen')
    await confirmationFrame.waitForSelector('#iban')
    await confirmationFrame.type('#iban', 'DE11520513735120710131') // Testing IBAN provided by Klarna
    await confirmationFrame.click('#aligned-content__button__0')

    // Suspend two seconds to wait for iframe page refresh
    await confirmationFrame.waitForTimeout(2_000)

    return confirmationFrame.click('#aligned-content__button__0')
  }
}
