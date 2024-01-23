import config from '../../src/config/config.js'
import { routes } from '../../src/routes.js'
import {
  initPuppeteerBrowser,
  assertCreatePaymentSession,
  serveFile,
  createPaymentSession,
  getCreateSessionRequest,
} from './e2e-test-utils.js'
import ctpClientBuilder from '../../src/ctp.js'
import PaypalInitSessionFormPage from './pageObjects/PaypalInitSessionFormPage.js'
import PaypalPopupPage from './pageObjects/PaypalPopupPage.js'
import httpUtils from '../../src/utils.js'

describe.skip('::paypalPayment::', () => {
  let browser
  let ctpClient
  let initPaymentSessionFormPage
  const adyenMerchantAccount = config.getAllAdyenMerchantAccounts()[0]
  const ctpProjectKey = config.getAllCtpProjectKeys()[0]
  const logger = httpUtils.getLogger()

  beforeEach(async () => {
    routes['/init-session-form'] = async (request, response) => {
      serveFile(
        './test/e2e/fixtures/paypal-init-session-form.html',
        request,
        response,
      )
    }

    const ctpConfig = config.getCtpConfig(ctpProjectKey)
    ctpClient = await ctpClientBuilder.get(ctpConfig)
    browser = await initPuppeteerBrowser()
  })

  afterEach(async () => {
    await browser.close()
  })

  it(
    'when payment method is paypal and process is done correctly, ' +
      'then it should successfully finish the payment',
    async () => {
      // let initPaymentSessionResult
      const baseUrl = config.getModuleConfig().apiExtensionBaseUrl
      const browserTab = await browser.newPage()
      const clientKey = config.getAdyenConfig(adyenMerchantAccount).clientKey
      const paypalMerchantId =
        config.getAdyenConfig(adyenMerchantAccount).paypalMerchantId

      const paymentAfterCreateSession = await createSession(clientKey)
      logger.debug(
        'credit-card::paymentAfterCreateSession:',
        JSON.stringify(paymentAfterCreateSession),
      )

      await initPaymentSession({
        browserTab,
        baseUrl,
        clientKey,
        paymentAfterCreateSession,
        paypalMerchantId,
      })

      const pages = await browser.pages()
      const popup = pages[pages.length - 1]

      await handlePaypalPopUp(popup)
      const initPaymentSessionResult =
        await initPaymentSessionFormPage.getPaymentAuthResult()

      assertCreatePaymentSession(
        paymentAfterCreateSession,
        initPaymentSessionResult,
      )
    },
  )

  async function createSession(clientKey) {
    const createSessionRequest = await getCreateSessionRequest(clientKey)
    let payment
    const startTime = new Date().getTime()
    try {
      payment = await createPaymentSession(
        ctpClient,
        adyenMerchantAccount,
        ctpProjectKey,
        createSessionRequest,
      )
    } catch (err) {
      logger.error('paypal::createSession::errors', JSON.stringify(err))
    } finally {
      const endTime = new Date().getTime()
      logger.debug('paypal::createSession:', endTime - startTime)
    }

    return payment
  }

  async function initPaymentSession({
    browserTab,
    baseUrl,
    clientKey,
    paymentAfterCreateSession,
    paypalMerchantId,
  }) {
    initPaymentSessionFormPage = new PaypalInitSessionFormPage(
      browserTab,
      baseUrl,
    )
    await initPaymentSessionFormPage.goToThisPage()

    await initPaymentSessionFormPage.initPaymentSession({
      clientKey,
      paymentAfterCreateSession,
      paypalMerchantId,
    })
  }

  async function handlePaypalPopUp(browserTab) {
    const paypalPopupPage = new PaypalPopupPage(browserTab)
    await paypalPopupPage.handlePaypalPopUp()
  }
})
