const ctpClientBuilder = require('../../src/ctp')
const { routes } = require('../../src/routes')
const config = require('../../src/config/config')
const MakePaymentFormPage = require('./pageObjects/CreditCardMakePaymentFormPage')
const httpUtils = require('../../src/utils')

const logger = httpUtils.getLogger()
const {
  assertPayment,
  createPayment,
  initPuppeteerBrowser,
  serveFile,
} = require('./e2e-test-utils')

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
    ctpClient = ctpClientBuilder.get(ctpConfig)
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
          const baseUrl = config.getModuleConfig().apiExtensionBaseUrl
          const clientKey =
            config.getAdyenConfig(adyenMerchantAccount).clientKey
          const payment = await createPayment(
            ctpClient,
            adyenMerchantAccount,
            ctpProjectKey
          )

          const browserTab = await browser.newPage()

          const paymentAfterMakePayment = await makePayment({
            browserTab,
            payment,
            baseUrl,
            creditCardNumber,
            creditCardDate,
            creditCardCvc,
            clientKey,
          })

          assertPayment(paymentAfterMakePayment, 'makePayment')
        }
      )
    }
  )

  async function makePayment({
    browserTab,
    payment,
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
    let result = null
    try {
      result = await ctpClient.update(
        ctpClient.builder.payments,
        payment.id,
        payment.version,
        [
          {
            action: 'setCustomField',
            name: 'makePaymentRequest',
            value: makePaymentRequest,
          },
        ]
      )
    } catch (err) {
      logger.error('credit-card::makePayment::errors:', err)
    }

    return result.body
  }
})
