module.exports = class AffirmPage {
  constructor(page) {
    this.page = page
  }

  async finishAffirmPayment() {
    await this.page.click('#buy-button')
    const confirmationFrame = this.page
      .frames()
      .find((f) => f.name() === 'affirm-hpp-instance-fullscreen')
    await confirmationFrame.waitForSelector(
      '#mandate-review__confirmation-button'
    )
    return confirmationFrame.click('#mandate-review__confirmation-button')
  }
}
