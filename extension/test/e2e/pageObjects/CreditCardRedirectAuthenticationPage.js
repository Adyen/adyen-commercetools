export default class CreditCardRedirectAuthenticationPage {
  constructor(page) {
    this.page = page
  }

  async doPaymentAuthentication() {
    await this.page.waitForTimeout(10_000)
    await this.page.waitForSelector('#username')
    await this.page.type('#username', 'user')
    await this.page.type('#password', 'password')

    console.log('ready to click auth submit button')
    await this.page.click('.paySubmit')
    console.log('after clicking auth submit button')
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
