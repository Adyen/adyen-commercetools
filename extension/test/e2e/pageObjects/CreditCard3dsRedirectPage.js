export default class CreditCard3dsRedirectPage {
  constructor(page) {
    this.page = page
  }

  async finish3dsRedirectPayment() {
    await this.page.waitForTimeout(2_000)
    console.log('finish3dsRedirectPayment')
    await this.page.waitForSelector('#username')
    await this.page.type('#username', 'user')
    await this.page.type('#password', 'password')

    await Promise.all([
      this.page.click('.paySubmit'),
      this.page.waitForSelector('#redirect-response'),
    ])

    await this.page.waitForTimeout(2_000)
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
