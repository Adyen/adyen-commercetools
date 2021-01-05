const iTSetUp = require('../integration/integration-test-set-up')
const ctpClientBuilder = require('../../src/ctp')
const { routes } = require('../../src/routes')
const configBuilder = require('../../src/config/config')
const MakePaymentFormPage = require('./pageObjects/CreditCardMakePaymentFormPage')
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

  // See more: https://docs.adyen.com/development-resources/test-cards/test-card-numbers
  const creditCards = [
    { name: 'Mastercard', creditCardNumber: '5101 1800 0000 0007' },
    { name: 'VISA', creditCardNumber: '4166 6766 6766 6746' },
  ]

  beforeEach(async () => {
    routes['/make-payment-form'] = async (request, response) => {
      serveFile('./test/e2e/fixtures/make-payment-form.html', request, response)
    }
    ctpClient = ctpClientBuilder.get()
    await iTSetUp.initServerAndExtension({
      ctpClient,
      routes,
      testServerPort: 8080,
    })
    browser = await initPuppeteerBrowser()
  })

  afterEach(async () => {
    await iTSetUp.stopRunningServers()
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
          const config = configBuilder.load()
          const baseUrl = config.apiExtensionBaseUrl
          const clientKey = config.adyen.clientKey
          const payment = await createPayment(ctpClient, baseUrl)

          const browserTab = await browser.newPage()

          const paymentAfteMakePayment = await makePayment({
            browserTab,
            payment,
            baseUrl,
            creditCardNumber,
            creditCardDate,
            creditCardCvc,
            clientKey,
          })

          assertPayment(paymentAfteMakePayment, 'makePayment')
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

    const { body: updatedPayment } = await ctpClient.update(
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

    return updatedPayment
  }
})
