const puppeteer = require('puppeteer')
const nodeStatic = require('node-static')
const iTSetUp = require('../integration/integration-test-set-up')
const ctpClientBuilder = require('../../src/ctp/ctp-client')
const { routes } = require('../../src/routes')
const MakePaymentFormPage = require('./pageObjects/CreditCardMakePaymentFormPage')
const { assertPayment, createPaymentWithOriginKeyResponse } = require('./e2e-test-utils')

// Flow description: https://docs.adyen.com/checkout/components-web
describe('::creditCardPayment::', () => {
  let browser
  let ctpClient

  // See more: https://docs.adyen.com/development-resources/test-cards/test-card-numbers
  const creditCards = [
    { name: 'Mastercard', creditCardNumber: '5101 1800 0000 0007' },
    { name: 'VISA', creditCardNumber: '4166 6766 6766 6746' }
  ]

  beforeEach(async () => {
    const fileServer = new nodeStatic.Server()
    routes['/make-payment-form'] = async (request, response) => {
      fileServer.serveFile('./test/e2e/fixtures/make-payment-form.html', 200, {}, request, response)
    }
    ctpClient = ctpClientBuilder.get()
    await iTSetUp.initServerAndExtension({ ctpClient, routes, testServerPort: 8080 })
    browser = await puppeteer.launch({
      headless: true,
      ignoreHTTPSErrors: true,
      args: ['--disable-web-security', '--disable-features=IsolateOrigins,site-per-process']
    })
  })

  afterEach(async () => {
    await iTSetUp.stopRunningServers()
    await browser.close()
  })

  creditCards.forEach(({
                         name, creditCardNumber, creditCardDate = '03/30', creditCardCvc = '737'
                       }) => {
    // eslint-disable-next-line no-template-curly-in-string
    it(`when issuer is ${name} and number is ${creditCardNumber}, ` +
      'it should successfully finish the payment with credit card',
      async () => {
        const baseUrl = process.env.API_EXTENSION_BASE_URL
        const payment = await createPaymentWithOriginKeyResponse(ctpClient, baseUrl)
        const { getOriginKeysResponse: getOriginKeysResponseString } = payment.custom.fields
        const getOriginKeysResponse = await JSON.parse(getOriginKeysResponseString)

        const page = await browser.newPage()
        // Make payment:
        const makePaymentFormPage = new MakePaymentFormPage(page, baseUrl)
        await makePaymentFormPage.goToThisPage()
        const makePaymentRequest = await makePaymentFormPage.getMakePaymentRequest({
          getOriginKeysResponse,
          creditCardNumber,
          creditCardDate,
          creditCardCvc
        })

        const { body: updatedPayment } = await ctpClient.update(ctpClient.builder.payments, payment.id,
          payment.version, [{
            action: 'setCustomField',
            name: 'makePaymentRequest',
            value: makePaymentRequest
          }])

        assertPayment(updatedPayment, 'makePayment')
      })
  })
})
