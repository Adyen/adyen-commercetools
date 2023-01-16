import ctpClientBuilder from '../../src/ctp.js'
import config from '../../src/config/config.js'
import { routes } from '../../src/routes.js'
import httpUtils from '../../src/utils.js'
import {
  createPaymentSession,
  getCreateSessionRequest,
  initPuppeteerBrowser,
  serveFile,
  getRequestParams,
  assertCreatePaymentSession,
} from './e2e-test-utils.js'
import RedirectPaymentFormPage from './pageObjects/RedirectPaymentFormPage.js'
import CreditCard3dsRedirectPage from './pageObjects/CreditCard3dsRedirectPage.js'
import CreateSessionFormPage from './pageObjects/CreditCard3dsCreateSessionFormPage.js'
const logger = httpUtils.getLogger()

function setRoute() {
  routes['/create-session-form'] = async (request, response) => {
    serveFile(
      './test/e2e/fixtures/credit-card-create-session-form.html',
      request,
      response
    )
  }
  routes['/redirect-payment-form'] = async (request, response) => {
    console.log('return')
    serveFile(
      './test/e2e/fixtures/redirect-payment-form-v5.html',
      request,
      response
    )
  }
  // routes['/return-url'] = async (request, response) => {
  //
  //   const params = getRequestParams(request.url)
  //
  //    sessionId = params.sessionId
  //    redirectResult = params.redirectResult
  //
  //   if (browser && browserTab && baseUrl) {
  //
  //
  //
  //     const redirectPaymentFormPage = new RedirectPaymentFormPage(
  //         browserTab,
  //         baseUrl
  //     )
  //
  //     await redirectPaymentFormPage.goToThisPage()
  //     await redirectPaymentFormPage.redirectToAdyenPaymentPage(sessionId, redirectResult)
  //
  //     await Promise.all([
  //       redirectPaymentFormPage.redirectToAdyenPaymentPage(sessionId, redirectResult),
  //       newBrowserTab.waitForNavigation(),
  //     ])
  //   }
  // }
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
}

// Flow description: https://docs.adyen.com/checkout/3d-secure/redirect-3ds2-3ds1/web-component
describe('::creditCardPayment3dsRedirect::', () => {
  let baseUrl
  let browser

  let ctpClient

  const adyenMerchantAccount = config.getAllAdyenMerchantAccounts()[0]
  const ctpProjectKey = config.getAllCtpProjectKeys()[0]

  // See more: https://docs.adyen.com/development-resources/test-cards/test-card-numbers
  const creditCards = [
    {
      name: 'Mastercard',
      creditCardNumber: '5212 3456 7890 1234',
    },
    // {
    //   name: 'Visa',
    //   creditCardNumber: '4212 3456 7890 1237',
    // },
  ]

  beforeEach(async () => {
    setRoute()

    const ctpConfig = config.getCtpConfig(ctpProjectKey)
    ctpClient = await ctpClientBuilder.get(ctpConfig)
    browser = await initPuppeteerBrowser()
  })

  afterEach(async () => {
    await browser.close()
  })

  creditCards.forEach(
    ({
      name,
      creditCardNumber,
      creditCardDate = '03/30',
      creditCardCvc = '737',
    }) => {
      // eslint-disable-next-line no-template-curly-in-string
      it(
        `when credit card issuer is ${name} and credit card number is ${creditCardNumber}, ` +
          'then it should successfully finish the payment with 3DS redirect flow',
        async () => {
          let paymentAfterCreateSession
          let redirectPaymentResult
          try {
            baseUrl = config.getModuleConfig().apiExtensionBaseUrl
            const clientKey =
              config.getAdyenConfig(adyenMerchantAccount).clientKey

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
            redirectPaymentResult = await handleRedirect({
              browserTab,
              baseUrl,
              clientKey,
            })
            logger.debug(
              'credit-card-3ds-redirect::redirectPaymentResult:',
              JSON.stringify(redirectPaymentResult)
            )
          } catch (err) {
            console.log(err)
            logger.error(
              'credit-card-3ds-redirect::errors',
              JSON.stringify(err)
            )
          }
          assertCreatePaymentSession(
            paymentAfterCreateSession,
            redirectPaymentResult
          )
        }
      )
    }
  )

  async function createSession(clientKey) {
    const createSessionRequest = await getCreateSessionRequest(clientKey)
    let payment = null
    const startTime = new Date().getTime()
    try {
      payment = await createPaymentSession(
        ctpClient,
        adyenMerchantAccount,
        ctpProjectKey,
        createSessionRequest
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
    creditCardNumber,
    creditCardDate,
    creditCardCvc,
  }) {
    const createSessionFormPage = new CreateSessionFormPage(browserTab, baseUrl)
    await createSessionFormPage.goToThisPage()
    return await createSessionFormPage.initPaymentSession({
      clientKey,
      paymentAfterCreateSession,
      creditCardNumber,
      creditCardDate,
      creditCardCvc,
    })
  }

  async function handleRedirect({ browserTab, baseUrl, clientKey }) {
    let result = null
    const startTime = new Date().getTime()

    try {
      const creditCardRedirectPage = new CreditCard3dsRedirectPage(browserTab)
      const { sessionId, redirectResult } =
        await creditCardRedirectPage.finish3dsRedirectPayment()

      const redirectPaymentFormPage = new RedirectPaymentFormPage(
        browserTab,
        baseUrl
      )

      await redirectPaymentFormPage.goToThisPage()

      const resultCode =
        await redirectPaymentFormPage.redirectToAdyenPaymentPage(
          clientKey,
          sessionId,
          redirectResult
        )

      return resultCode
    } finally {
      const endTime = new Date().getTime()
      logger.debug(
        'credit-card-3ds-redirect::handleRedirect:',
        endTime - startTime
      )
    }
    return result
  }
})
