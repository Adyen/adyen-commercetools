export default class PaypalPopupPage {
  constructor(page) {
    this.page = page
  }

  async handlePaypalPopUp() {
    await this.page.waitForTimeout(2_000)

    await this.page.waitForSelector('#email')
    await this.page.type('#email', 'sb-urfdg23058190@personal.example.com')
    await this.page.click('#btnNext')

    await this.page.waitForTimeout(4_000)

    await this.page.type('#password', '!nh-NNS1')
    await this.page.waitForSelector('#btnLogin')
    const loginButton = await this.page.$('#btnLogin')
    await this.page.evaluate((cb) => cb.click(), loginButton)


    await this.page.waitForSelector('#payment-submit-btn')
    const submitButton = await this.page.$('#payment-submit-btn')
    await this.page.evaluate((cb) => cb.click(), submitButton)

  }
}
