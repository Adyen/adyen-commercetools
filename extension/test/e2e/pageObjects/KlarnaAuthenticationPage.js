export default class KlarnaAuthenticationPage {
  constructor(page) {
    this.page = page
  }

  async doPaymentAuthentication() {
    // await this.clickProceedButton()
    await this.processOtpAndPay()
    return await this.redirectToResultPage()
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

  async clickProceedButton() {
    // Wait for Klarna page being totally loaded
    const klarnaMainFrame = this.page
      .frames()
      .find((f) => f.name() === 'klarna-hpp-instance-main')
    await klarnaMainFrame.waitForSelector('#scheme-payment-selector')
    await this.page.waitForTimeout(2_000)
    await this.page.click('#buy-button')
  }

  async processOtpAndPay() {
    await this.page.waitForSelector('#klarna-apf-iframe')
    const klarnaIframeElementHandle = await this.page.$('#klarna-apf-iframe')
    const klarnaIframe = await klarnaIframeElementHandle.contentFrame()

    // Use focus and keyboard instead of click method (see https://github.com/puppeteer/puppeteer/issues/4754)
    await klarnaIframe.waitForSelector(
      '#newCollectPhone [data-testid="kaf-button"]',
      { visible: true },
    )
    await klarnaIframe.focus('#newCollectPhone [data-testid="kaf-button"]')
    await this.page.keyboard.press('Enter')

    await klarnaIframe.waitForSelector('#otp_field')
    await klarnaIframe.type('#otp_field', '123456')

    // Sleep before final searching for iban field because klarna uses some effects for rendering.
    // We just need to wait for effect to finish.
    await this.page.waitForTimeout(1_000)
    await klarnaIframe.waitForSelector('[data-testid="pick-plan"]')
    await klarnaIframe.click('#directdebit\\.0-ui button[role="option"]')
    await klarnaIframe.click('[data-testid="pick-plan"]')

    // Sleep before final searching for iban field because klarna uses some effects for rendering.
    // We just need to wait for effect to finish.
    await this.page.waitForTimeout(1_000)

    const ibanField = await klarnaIframe.$('#iban')

    if (ibanField) {
      await klarnaIframe.waitForSelector('[data-testid="confirm-and-pay"]', {
        visible: true,
      })
      await klarnaIframe.click('[data-testid="confirm-and-pay"]')

      await klarnaIframe.waitForSelector('#iban')
      await klarnaIframe.type('#iban', 'DE1152 0513 7351 2071 0131')
      await klarnaIframe.waitForSelector('[data-testid="confirm-and-pay"]', {
        visible: true,
      })
      await klarnaIframe.click('[data-testid="confirm-and-pay"]')

      await klarnaIframe.waitForSelector('#directdebit\\.0-mandate-review', {
        visible: true,
      })
      const dialogButtons = await klarnaIframe.$$(
        '#directdebit\\.0-mandate-review button',
        { visible: true },
      )
      const confirmButton = dialogButtons[dialogButtons.length - 1]
      await confirmButton.click()

      await klarnaIframe.waitForSelector(
        '[data-testid="summary"] [data-testid="confirm-and-pay"]',
        { visible: true },
      )
      await klarnaIframe.click('[data-testid="confirm-and-pay"]')
    } else {
      const finalSubmitButton = await klarnaIframe.$(
        '[data-testid="summary"] [data-testid="confirm-and-pay"]',
      )

      // Sleep before final click because klarna uses some internal state to disable button directly with its style.
      // We just need to wait for effect to finish.
      await this.page.waitForTimeout(1_000)
      await finalSubmitButton.click()
    }

    await this.page.waitForSelector('#redirect-response')
  }
}
