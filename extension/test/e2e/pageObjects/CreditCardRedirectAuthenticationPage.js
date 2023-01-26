export default class CreditCardRedirectAuthenticationPage {
  constructor(page) {
    this.page = page
  }

  async doPaymentAuthentication() {
    await this.page.waitForTimeout(5_000)
    await this.page.waitForSelector('.paySubmit')
    await this.page.type('#username', 'user')
    await this.page.type('#password', 'password')

    console.log('ready to click auth submit button')
    await this.page.click('.paySubmit')
    console.log('after clicking auth submit button')
    await this.page.waitForTimeout(10_000) // wait for redirect response
    console.log('URL')
    console.log(this.page.url())
    const body = await this.page.$('body')
    const bodyHTML = await (await body.getProperty('innerHTML')).jsonValue()

    console.log('bodyHTML')
    console.log(bodyHTML)
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
