module.exports = class KlarnaPage {
  constructor (page, baseUrl) {
    this.page = page
    this.baseUrl = baseUrl
  }

  async finishKlarnaPayment () {
    await this.page.click('#buy-button')
    const confirmationFrame = this.page.frames().find(f => f.name() === 'klarna-hpp-instance-fullscreen')
    await confirmationFrame.waitForSelector('#direct-debit-mandate-review__bottom button')
    return confirmationFrame.click('#direct-debit-mandate-review__bottom button')
  }
}
