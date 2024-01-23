import ctpClientBuilder from '../../src/ctp.js'
import { routes } from '../../src/routes.js'
import config from '../../src/config/config.js'
import CreditCardInitSessionFormPage from './pageObjects/CreditCardInitSessionFormPage.js'
import httpUtils from '../../src/utils.js'

import {
  assertCreatePaymentSession,
  createPaymentSession,
  getCreateSessionRequest,
  initPuppeteerBrowser,
  serveFile,
} from './e2e-test-utils.js'

const logger = httpUtils.getLogger()

function setRoute() {
  routes['/init-session-form'] = async (request, response) => {
    serveFile(
      './test/e2e/fixtures/credit-card-init-session-form.html',
      request,
      response,
    )
  }
}
// Flow description: https://docs.adyen.com/checkout/components-web
describe('::creditCardPayment::', () => {
  let browser
  let ctpClient
  const ctpProjectKey = config.getAllCtpProjectKeys()[0]
  const adyenMerchantAccount = config.getAllAdyenMerchantAccounts()[0]

  // See more: https://docs.adyen.com/development-resources/test-cards/test-card-numbers
  const creditCards = [
    { name: 'Mastercard', creditCardNumber: '5101 1800 0000 0007' },
    { name: 'VISA', creditCardNumber: '4646 4646 4646 4644' },
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
          'then it should successfully finish the payment',
        async () => {
          let paymentAfterCreateSession
          let initPaymentSessionResult
          try {
            const baseUrl = config.getModuleConfig().apiExtensionBaseUrl
            const clientKey =
              config.getAdyenConfig(adyenMerchantAccount).clientKey
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
              'credit-card::paymentAfterCreateSession:',
              JSON.stringify(paymentAfterCreateSession),
            )

            // Step #2 - Setup Component
            // https://docs.adyen.com/online-payments/web-components#set-up

            initPaymentSessionResult = await initPaymentSession({
              browserTab,
              baseUrl,
              clientKey,
              paymentAfterCreateSession,
              creditCardNumber,
              creditCardDate,
              creditCardCvc,
            })
          } catch (err) {
            logger.error('credit-card::errors:', JSON.stringify(err))
          }

          assertCreatePaymentSession(
            paymentAfterCreateSession,
            initPaymentSessionResult,
          )
        },
      )
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
    await initSessionFormPage.initPaymentSession({
      clientKey,
      paymentAfterCreateSession,
      creditCardNumber,
      creditCardDate,
      creditCardCvc,
    })
    return await initSessionFormPage.getPaymentAuthResult()
  }
})
