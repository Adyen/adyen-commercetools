module.exports = class CreditCard3dsV2Page {
  constructor (page, baseUrl) {
    this.page = page
    this.baseUrl = baseUrl
  }

  async finishRedirectPayment () {
    await this.page.type('#username', 'user')
    await this.page.type('#password', 'password')

    await Promise.all([
      this.page.click('.paySubmit'),
      this.page.waitForSelector('#redirect-response')
    ])
    const element = await this.page.$('#redirect-response')
    return this.page.evaluate(el => el.textContent, element)
  }
}
