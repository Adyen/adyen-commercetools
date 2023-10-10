export default class AffirmRedirectAuthenticationPage {
  constructor(page) {
    this.page = page
  }

  async doPaymentAuthentication() {
    await this.inputPhoneNumberAndClickSubmitButton()
    await this.inputPIN()
    await this.choosePlan()
    await this.clickAutoPayToggleAndProceed()
    return await this.redirectToResultPage()
  }

  async inputPhoneNumberAndClickSubmitButton() {
    await this.page.waitForSelector('[data-testid="phone-number-field"]')
    await this.page.type('[data-testid="phone-number-field"]', '212-220-3809')
    await this.page.click('[data-testid="submit-button"]')
    await this.page.waitForSelector('[aria-label="PIN"]')
  }

  async inputPIN() {
    await this.page.type('[aria-label="PIN"]', '1234')
    await this.page.waitForTimeout(5_000) // wait for overlay loading
  }

  async choosePlan() {
    await this.page.waitForSelector('[data-testid=term-card]')

    const paymentRadioButtonEle = await this.page.$('[data-testid=term-card]')
    await this.page.evaluate((cb) => cb.click(), paymentRadioButtonEle)

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
      '[data-testid="disclosure-checkbox-indicator"]',
    )
    await this.page.evaluate((cb) => cb.click(), confirmCheckbox)
    await Promise.all([
      this.page.click('[data-testid="submit-button"]'),
      this.page.waitForSelector('#redirect-response'),
    ])
  }

  async redirectToResultPage() {
    const sessionIdEle = await this.page.$('#sessionId')
    const redirectResultEle = await this.page.$('#redirectResult')
    const sessionId = await this.page.evaluate(
      (el) => el.textContent,
      sessionIdEle,
    )
    const redirectResult = await this.page.evaluate(
      (el) => el.textContent,
      redirectResultEle,
    )
    return { sessionId, redirectResult }
  }
}
