import ctpClientBuilder from '../../src/ctp.js'
import { routes } from '../../src/routes.js'
import config from '../../src/config/config.js'
import MakePaymentFormPage from './pageObjects/CreditCardMakePaymentFormPage.js'
import httpUtils from '../../src/utils.js'
import {
  assertPayment,
  createPayment,
  initPuppeteerBrowser,
  serveFile,
} from './e2e-test-utils.js'

const logger = httpUtils.getLogger()

// Flow description: https://docs.adyen.com/checkout/components-web
describe('::creditCardPayment::', () => {
  let browser
  let ctpClient
  const ctpProjectKey = config.getAllCtpProjectKeys()[0]
  const adyenMerchantAccount = config.getAllAdyenMerchantAccounts()[0]

  // See more: https://docs.adyen.com/development-resources/test-cards/test-card-numbers
  const creditCards = [
    { name: 'Mastercard', creditCardNumber: '5101 1800 0000 0007' },
    { name: 'VISA', creditCardNumber: '4166 6766 6766 6746' },
  ]

  beforeEach(async () => {
    routes['/make-payment-form'] = async (request, response) => {
      serveFile('./test/e2e/fixtures/make-payment-form.html', request, response)
    }
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
          let paymentAfterMakePayment
          try {
            const baseUrl = config.getModuleConfig().apiExtensionBaseUrl
            const clientKey =
              config.getAdyenConfig(adyenMerchantAccount).clientKey
            const browserTab = await browser.newPage()

            paymentAfterMakePayment = await makePayment({
              browserTab,
              baseUrl,
              creditCardNumber,
              creditCardDate,
              creditCardCvc,
              clientKey,
            })
            logger.debug(
              'credit-card::paymentAfterMakePayment:',
              JSON.stringify(paymentAfterMakePayment)
            )
          } catch (err) {
            logger.error('credit-card::errors:', JSON.stringify(err))
          }
          assertPayment(paymentAfterMakePayment, 'makePayment')
        }
      )
    }
  )

  async function makePayment({
    browserTab,
    baseUrl,
    creditCardNumber,
    creditCardDate,
    creditCardCvc,
    clientKey,
  }) {
    const makePaymentFormPage = new MakePaymentFormPage(browserTab, baseUrl)
    await makePaymentFormPage.goToThisPage()
    const makePaymentRequest = await makePaymentFormPage.getMakePaymentRequest({
      creditCardNumber,
      creditCardDate,
      creditCardCvc,
      clientKey,
    })
    let payment = null
    const startTime = new Date().getTime()
    try {
      payment = await createPayment(
        ctpClient,
        adyenMerchantAccount,
        ctpProjectKey,
        makePaymentRequest
      )
    } finally {
      const endTime = new Date().getTime()
      logger.debug('credit-card::makePayment:', endTime - startTime)
    }

    return payment
  }
})
