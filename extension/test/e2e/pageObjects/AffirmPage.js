export default class AffirmPage {
  constructor(page) {
    this.page = page
  }

  async doPaymentAuthentication() {
    await this.inputPhoneNumberAndClickSubmitButton()
    await this.inputPIN()
    await this.clickTermCardAndProceed()
    await this.clickAutoPayToggleAndProceed()
    return await this.redirectToResultPage()
  }

  async redirectToResultPage() {
    const sessionIdEle = await this.page.$('#sessionId')
    const redirectResultEle = await this.page.$('#redirectResult')
    const sessionId = await this.page.evaluate(
      (el) => el.textContent,
      sessionIdEle
    )
    const redirectResult = await this.page.evaluate(
      (el) => el.textContent,
      redirectResultEle
    )
    console.log(sessionId)
    console.log(redirectResult)
    return { sessionId, redirectResult }
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

  async clickTermCardAndProceed() {
    await this.page.click('[data-test="term-card"]')
    await this.page.click('[data-testid="submit-button"]')
  }

  async clickAutoPayToggleAndProceed() {
    await this.page.waitForSelector('#autopay-toggle')
    const autoPayToggle = await this.page.$('#autopay-toggle')
    await this.page.evaluate((cb) => cb.click(), autoPayToggle)
    await this.page.waitForTimeout(2_000) // Wait for the page refreshes after toggling the autopay
    const confirmCheckbox = await this.page.$(
      '[data-testid="disclosure-checkbox-indicator"]'
    )
    await this.page.evaluate((cb) => cb.click(), confirmCheckbox)
    await Promise.all([
      this.page.click('[data-testid="submit-button"]'),
      this.page.waitForSelector('#redirect-response'),
    ])
  }
}
