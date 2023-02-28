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

    // await this.page.click('#acceptAllButton')
    await this.page.type('#password', '!nh-NNS1')
    await this.page.waitForSelector('#btnLogin')
    await this.page.click('#btnLogin')

    await this.page.waitForSelector('#payment-submit-btn')
    await this.page.waitForTimeout(1000) // Need to suspend 1 second to avoid page closed before loading data.
    await this.page.click('#payment-submit-btn')
  }
}
