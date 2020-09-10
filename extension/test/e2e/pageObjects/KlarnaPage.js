module.exports = class KlarnaPage {
  constructor (page) {
    this.page = page
  }

  async finishKlarnaPayment () {
    await this.page.click('#buy-button')
    const confirmationFrame = this.page.frames().find(f => f.name() === 'klarna-hpp-instance-fullscreen')
    await confirmationFrame.waitForSelector('#paynow-aligned-content button')
    return confirmationFrame.click('#paynow-aligned-content button')
  }
}
