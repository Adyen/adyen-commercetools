export default class AffirmPage {
  constructor(page) {
    this.page = page
  }

  async finishAffirmPayment() {
    await this.inputPhoneNumberAndClickSubmitButton()
    await this.inputPIN()
    await this.choosePlan()
    await this.clickAutoPayToggleAndProceed()
  }

  async inputPhoneNumberAndClickSubmitButton() {
    await this.page.waitForSelector('[data-testid="phone-number-field"]')
    await this.page.type('[data-testid="phone-number-field"]', '212-220-3809')
    await this.page.click('[data-testid="submit-button"]')
    await this.page.waitForSelector('[aria-label="PIN"]')
  }

  async inputPIN() {
    await this.page.type('[aria-label="PIN"]', '1234')
    await this.page.waitForSelector('[data-test=term-card]')
  }

  async choosePlan() {
    await this.page.waitForTimeout(1_000)

    const paymentRadioButton = await this.page.$('[data-testid="radio_button"]')
    await this.page.evaluate((cb) => cb.click(), paymentRadioButton)
    await this.page.waitForSelector('[data-testid="submit-button"]')

    const submitButton = await this.page.$('[data-testid="submit-button"]')
    await this.page.evaluate((cb) => cb.click(), submitButton)
  }

  async clickAutoPayToggleAndProceed() {
    await this.page.waitForSelector('#autopay-toggle')
    const autoPayToggle = await this.page.$('#autopay-toggle')
    await this.page.evaluate((cb) => cb.click(), autoPayToggle)
    await this.page.waitForTimeout(1_000) // Wait for the page refreshes after toggling the autopay
    const confirmCheckbox = await this.page.$(
      '[data-testid="disclosure-checkbox-indicator"]'
    )
    await this.page.evaluate((cb) => cb.click(), confirmCheckbox)
    await this.page.click('[data-testid="submit-button"]')
  }
}
