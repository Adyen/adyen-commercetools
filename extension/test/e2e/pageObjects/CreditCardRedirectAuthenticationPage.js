export default class CreditCardRedirectAuthenticationPage {
  constructor(page) {
    this.page = page
  }

  async doPaymentAuthentication() {
    await this.page.waitForTimeout(2_000)
    await this.page.waitForSelector('#username')
    await this.page.type('#username', 'user')
    await this.page.type('#password', 'password')

    this.page.click('.paySubmit'),

    await this.page.waitForTimeout(5_000) // wait for redirect response
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
    return { sessionId, redirectResult }
  }
}
