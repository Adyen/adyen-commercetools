module.exports = class KlarnaPage {
  constructor(page) {
    this.page = page
  }

  async finishKlarnaPayment() {
    await this.page.click('#buy-button')
    const confirmationFrame = this.page
      .frames()
      .find((f) => f.name() === 'klarna-hpp-instance-fullscreen')
    await confirmationFrame.waitForSelector(
      '#iban'
    )
    await confirmationFrame.type('#iban','DE11520513735120710131') // Testing IBAN provided by Klarna
    await confirmationFrame.click('#aligned-content__button__0')
    await this.page.waitForTimeout(500)
    return confirmationFrame.click('#aligned-content__button__0')
  }
}
