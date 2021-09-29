module.exports = class AffirmPage {
  constructor(page) {
    this.page = page
  }

  async finishAffirmPayment() {
    // Input phone number and proceed
    await this.page.type('[data-testid="phone-number-field"]', '212-220-3809')
    await this.page.click('[data-testid="submit-button"]')
    await this.page.waitForSelector('[aria-label="PIN"]')

    // Input PIN code
    await this.page.type('[aria-label="PIN"]', '1234')

    // Enter the 2nd page and press continue button
    await this.page.waitForSelector('#confirm-submit')
    const autoPayToggle = await this.page.$('#autopay-toggle')
    await this.page.evaluate((cb) => cb.click(), autoPayToggle)

    // Wait for the page refreshes after toggling the autopay
    await this.page.waitForTimeout(1_000)

    await this.page.click('#confirm-submit')
    await this.page.waitForSelector('#confirm-disclosure-checkbox')

    // Enter confirmation page and press confirm button
    const confirmCheckbox = await this.page.$('#confirm-disclosure-checkbox')
    await this.page.evaluate((cb) => cb.click(), confirmCheckbox)
    return this.page.click('[data-test="confirm-loan-submit"]')
  }
}
