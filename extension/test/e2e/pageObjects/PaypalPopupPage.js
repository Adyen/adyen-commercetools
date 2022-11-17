export default class PaypalPopupPage {
  constructor(page) {
    this.page = page
  }

  async handlePaypalPopUp() {
    await this.page.waitForSelector('#email')
    await this.page.type('#email', 'sb-u4765x21503145@personal.example.com')
    await this.page.click('#btnNext')

    await this.page.waitForTimeout(1000)

    await this.page.click('#acceptAllButton')
    await this.page.type('#password', '3xG5+#+T')
    await this.page.click('#btnLogin')

    await this.page.waitForSelector('#payment-submit-btn')
    await this.page.click('#payment-submit-btn')
  }
}
