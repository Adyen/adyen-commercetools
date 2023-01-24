import ctpClientBuilder from '../../src/ctp.js'
import config from '../../src/config/config.js'
import { routes } from '../../src/routes.js'
import httpUtils from '../../src/utils.js'
import {
  assertCreatePaymentSession,
  createPaymentSession,
  getCreateSessionRequest,
  initPuppeteerBrowser,
  serveFile,
  getRequestParams,
} from './e2e-test-utils.js'
import RedirectPaymentFormPage from './pageObjects/RedirectPaymentFormPage.js'
import AffirmRedirectAuthenticationPage from './pageObjects/AffirmRedirectAuthenticationPage.js'
import AffirmInitSessionFormPage from './pageObjects/AffirmInitSessionFormPage.js'

const logger = httpUtils.getLogger()

// Flow description: https://docs.adyen.com/payment-methods/affirm/web-component#page-introduction
describe.skip('::affirmPayment::', () => {
  // TODO : Migrate e2e test for web component 5
  let browser
  let ctpClient
  const adyenMerchantAccount = config.getAllAdyenMerchantAccounts()[0]
  const ctpProjectKey = config.getAllCtpProjectKeys()[0]

  beforeEach(async () => {
    routes['/init-session-form'] = async (request, response) => {
      serveFile(
        './test/e2e/fixtures/affirm-init-session-form.html',
        request,
        response
      )
    }
    routes['/redirect-payment-form'] = async (request, response) => {
      serveFile(
        './test/e2e/fixtures/redirect-payment-form.html',
        request,
        response
      )
    }
    routes['/return-url'] = async (request, response) => {
      const params = getRequestParams(request.url)
      return httpUtils.sendResponse({
        response,
        headers: {
          'Content-Type': 'text/html',
        },
        data:
          '<!DOCTYPE html><html><head></head>' +
          '<body><div id=redirect-response>' +
          `<div id=sessionId>${params.sessionId}</div><div id=redirectResult>${params.redirectResult}</div>` +
          '</div></body></html>',
      })
    }

    const ctpConfig = config.getCtpConfig(ctpProjectKey)
    ctpClient = await ctpClientBuilder.get(ctpConfig)
    browser = await initPuppeteerBrowser()
  })

  afterEach(async () => {
    await browser.close()
  })

  it(
    'when payment method is affirm and process is done correctly, ' +
      'then it should successfully finish the payment',
    async () => {
      const baseUrl = config.getModuleConfig().apiExtensionBaseUrl
      const clientKey = config.getAdyenConfig(adyenMerchantAccount).clientKey
      let paymentAfterHandleRedirect
      let paymentAfterCreateSession
      let redirectPaymentResult
      try {
        const browserTab = await browser.newPage()
        // Step #1 - Create a payment session
        // https://docs.adyen.com/online-payments/web-components#create-payment-session
        paymentAfterCreateSession = await createSession(clientKey)
        logger.debug(
          'credit-card::paymentAfterCreateSession:',
          JSON.stringify(paymentAfterCreateSession)
        )

        // Step #2 - Setup Component
        // https://docs.adyen.com/online-payments/web-components#set-up
        const result = await initPaymentSession({
          browserTab,
          baseUrl,
          clientKey,
          paymentAfterCreateSession,
        })

        redirectPaymentResult = await handleRedirect({
          browserTab,
          baseUrl,
          clientKey,
        })
        logger.debug(
          'affirm::redirectPaymentResult:',
          JSON.stringify(redirectPaymentResult)
        )
      } catch (err) {
        logger.error('affirm::errors', err)
      }
      assertCreatePaymentSession(
        paymentAfterCreateSession,
        redirectPaymentResult
      )
    }
  )

  async function createSession(clientKey) {
    const createSessionRequest = await getCreateSessionRequest(clientKey, 'USD')
    let payment = null
    const startTime = new Date().getTime()
    try {
      payment = await createPaymentSession(
        ctpClient,
        adyenMerchantAccount,
        ctpProjectKey,
        createSessionRequest,
        'USD'
      )
    } catch (err) {
      console.log(err)
    } finally {
      const endTime = new Date().getTime()
      logger.debug('credit-card::createSession:', endTime - startTime)
    }

    return payment
  }

  async function initPaymentSession({
    browserTab,
    baseUrl,
    clientKey,
    paymentAfterCreateSession,
  }) {
    const initPaymentSessionFormPage = new AffirmInitSessionFormPage(
      browserTab,
      baseUrl
    )
    await initPaymentSessionFormPage.goToThisPage()

    return await initPaymentSessionFormPage.initPaymentSession({
      clientKey,
      paymentAfterCreateSession,
    })
  }

  async function handleRedirect({ browserTab, baseUrl, clientKey }) {
    // Redirect to Affirm page
    const affirmPage = new AffirmRedirectAuthenticationPage(browserTab)

    const { sessionId, redirectResult } =
      await affirmPage.doPaymentAuthentication()

    try {
      const redirectPaymentFormPage = new RedirectPaymentFormPage(
        browserTab,
        baseUrl
      )
      await redirectPaymentFormPage.goToThisPage()
      const submittedRedirectResult =
        await redirectPaymentFormPage.redirectToAdyenPaymentPage(
          clientKey,
          sessionId,
          redirectResult
        )

      console.log(submittedRedirectResult)
      return submittedRedirectResult
    } catch (err) {
      console.log(err)
    }
  }
})
