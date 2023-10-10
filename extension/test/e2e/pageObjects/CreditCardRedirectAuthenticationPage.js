export default class CreditCardRedirectAuthenticationPage {
  constructor(page) {
    this.page = page
  }

  async doPaymentAuthentication() {
    await this.page.waitForTimeout(2_000)
    await this.page.waitForSelector('.paySubmit')
    await this.page.type('#username', 'user')
    await this.page.type('#password', 'password')

    await Promise.all([
      this.page.click('.paySubmit'),
      this.page.waitForSelector('#redirect-response'),
    ])

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
