module.exports = class AffirmPage {
  constructor(page) {
    this.page = page
  }

  async finishAffirmPayment() {
    // Input phone number and proceed
    await this.page.type('[data-testid="phone-number-field"]', '919-539-8363')
    await this.page.click('button.propvHOJQwT')
    await this.page.waitForSelector('[aria-label="PIN"]')

    // Input PIN code
    await this.page.type('[aria-label="PIN"]', '1234')

    // Enter the 2nd page and press continue button
    await this.page.waitForSelector('#confirm-submit')
    await this.page.click('#confirm-submit')
    await this.page.waitForSelector('#confirm-disclosure-checkbox')

    // Enter confirmation page and press confirm button
    const confirmCheckbox = await this.page.$('#confirm-disclosure-checkbox')
    await this.page.evaluate((cb) => cb.click(), confirmCheckbox)

    return this.page.click('[data-test="confirm-loan-submit"]')
  }
}
