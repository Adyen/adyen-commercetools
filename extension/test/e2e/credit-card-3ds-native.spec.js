import ctpClientBuilder from '../../src/ctp.js'
import { routes } from '../../src/routes.js'
import config from '../../src/config/config.js'
import httpUtils from '../../src/utils.js'
import {
  initPuppeteerBrowser,
  serveFile,
  createPaymentSession,
  getCreateSessionRequest,
  getRequestParams,
  assertCreatePaymentSession,
} from './e2e-test-utils.js'
import CreditCardNativeAuthenticationPage from './pageObjects/CreditCardNativeAuthenticationPage.js'
import CreditCardInitSessionFormPage from './pageObjects/CreditCardInitSessionFormPage.js'

const logger = httpUtils.getLogger()

// Flow description: https://docs.adyen.com/checkout/3d-secure/native-3ds2/web-component
describe.skip('::creditCardPayment3dsNative::', () => {
  let browser
  let ctpClient
  const adyenMerchantAccount = config.getAllAdyenMerchantAccounts()[0]
  const ctpProjectKey = config.getAllCtpProjectKeys()[0]

  beforeEach(async () => {
    routes['/init-session-form'] = async (request, response) => {
      serveFile(
        './test/e2e/fixtures/3ds-v2-init-session-form.html',
        request,
        response,
      )
    }
    routes['/redirect-payment-form'] = async (request, response) => {
      serveFile(
        './test/e2e/fixtures/redirect-payment-form.html',
        request,
        response,
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
    `when credit card issuer is Visa and credit card number is 4917 6100 0000 0000, ` +
      'then it should successfully finish the payment with 3DS native authentication flow',
    async () => {
      // See more: https://docs.adyen.com/development-resources/test-cards/test-card-numbers
      const creditCardNumber = '4917 6100 0000 0000'
      const creditCardDate = '03/30'
      const creditCardCvc = '737'

      const baseUrl = config.getModuleConfig().apiExtensionBaseUrl
      const clientKey = config.getAdyenConfig(adyenMerchantAccount).clientKey
      let initPaymentResult
      let paymentAfterCreateSession
      try {
        const browserTab = await browser.newPage()
        // Step #1 - Create a payment session
        // https://docs.adyen.com/online-payments/web-components#create-payment-session
        const createSessionRequest = await getCreateSessionRequest(
          baseUrl,
          clientKey,
        )

        paymentAfterCreateSession = await createPaymentSession(
          ctpClient,
          adyenMerchantAccount,
          ctpProjectKey,
          createSessionRequest,
        )
        logger.debug(
          'credit-card-3ds-native::paymentAfterCreateSession:',
          JSON.stringify(paymentAfterCreateSession),
        )

        // Step #2 - Setup Component
        // https://docs.adyen.com/online-payments/web-components#set-up
        await initPaymentSession({
          browserTab,
          baseUrl,
          clientKey,
          paymentAfterCreateSession,
          creditCardNumber,
          creditCardDate,
          creditCardCvc,
        })

        // Step #3 - Handle Redirect
        // https://docs.adyen.com/online-payments/web-components#handle-redirect-result
        initPaymentResult = await performChallengeFlow({
          browserTab,
          baseUrl,
          clientKey,
        })
        logger.debug(
          'credit-card-3ds-native::initPaymentResult:',
          JSON.stringify(initPaymentResult),
        )
      } catch (err) {
        logger.error('credit-card-3ds-native::errors', JSON.stringify(err))
      }
      assertCreatePaymentSession(paymentAfterCreateSession, initPaymentResult)
    },
  )

  async function initPaymentSession({
    browserTab,
    baseUrl,
    clientKey,
    paymentAfterCreateSession,
    creditCardNumber,
    creditCardDate,
    creditCardCvc,
  }) {
    const initSessionFormPage = new CreditCardInitSessionFormPage(
      browserTab,
      baseUrl,
    )
    await initSessionFormPage.goToThisPage()
    return await initSessionFormPage.initPaymentSession({
      clientKey,
      paymentAfterCreateSession,
      creditCardNumber,
      creditCardDate,
      creditCardCvc,
    })
  }

  async function performChallengeFlow({ browserTab, baseUrl }) {
    await browserTab.waitForTimeout(5_000)

    const creditCardAuthenticationPage = new CreditCardNativeAuthenticationPage(
      browserTab,
    )

    await creditCardAuthenticationPage.doPaymentAuthentication()

    const initSessionFormPage = new CreditCardInitSessionFormPage(
      browserTab,
      baseUrl,
    )
    return await initSessionFormPage.getPaymentAuthResult()
  }
})
