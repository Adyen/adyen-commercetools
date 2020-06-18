const nodeStatic = require('node-static')
const querystring = require('querystring')
const iTSetUp = require('../integration/integration-test-set-up')
const ctpClientBuilder = require('../../src/ctp/ctp-client')
const { routes } = require('../../src/routes')
const httpUtils = require('../../src/utils')
const { assertPayment, createPaymentWithOriginKeyResponse, initPuppeteerBrowser } = require('./e2e-test-utils')
const MakePaymentFormPage = require('./pageObjects/CreditCardMakePaymentFormPage')
const RedirectPaymentFormPage = require('./pageObjects/RedirectPaymentFormPage')
const CreditCardRedirectPage = require('./pageObjects/CreditCard3dsRedirectPage')

// Flow description: https://docs.adyen.com/checkout/3d-secure/redirect-3ds2-3ds1/web-component
describe('::creditCardPayment3dsRedirect::', () => {
  let browser
  let ctpClient

  // See more: https://docs.adyen.com/development-resources/test-cards/test-card-numbers
  const creditCards = [
    {
      name: 'Mastercard',
      creditCardNumber: '5212 3456 7890 1234'
    },
    {
      name: 'Visa',
      creditCardNumber: '4212 3456 7890 1237'
    }
  ]

  beforeEach(async () => {
    const fileServer = new nodeStatic.Server()
    routes['/make-payment-form'] = async (request, response) => {
      fileServer.serveFile('./test/e2e/fixtures/make-payment-form.html', 200, {}, request, response)
    }
    routes['/redirect-payment-form'] = async (request, response) => {
      fileServer.serveFile('./test/e2e/fixtures/redirect-payment-form.html', 200, {}, request, response)
    }
    routes['/return-url'] = async (request, response) => {
      const body = await httpUtils.collectRequestData(request)
      return httpUtils.sendResponse({
        response,
        headers: {
          'Content-Type': 'text/html'
        },
        data: '<!DOCTYPE html><html><head></head>'
          + `<body><div id=redirect-response>${body[0].toString()}</div></body></html>`
      })
    }

    ctpClient = ctpClientBuilder.get()
    await iTSetUp.initServerAndExtension({ ctpClient, routes, testServerPort: 8080 })
    browser = await initPuppeteerBrowser()
  })

  afterEach(async () => {
    await iTSetUp.stopRunningServers()
    await browser.close()
  })

  creditCards.forEach(({
                         name, creditCardNumber, creditCardDate = '10/20', creditCardCvc = '737'
                       }) => {
    // eslint-disable-next-line no-template-curly-in-string
    it(`when credit card issuer is ${name} and credit card number is ${creditCardNumber}, ` +
      'it should successfully finish the payment with 3DS redirect flow',
      async () => {
        const baseUrl = process.env.API_EXTENSION_BASE_URL
        const payment = await createPaymentWithOriginKeyResponse(ctpClient, baseUrl)
        const { getOriginKeysResponse: getOriginKeysResponseString } = payment.custom.fields
        const getOriginKeysResponse = await JSON.parse(getOriginKeysResponseString)

        const browserTab = await browser.newPage()

        const paymentAfterMakePayment = await makePayment({
          browserTab,
          baseUrl,
          getOriginKeysResponse,
          creditCardNumber,
          creditCardDate,
          creditCardCvc,
          payment
        })

        const paymentAfterRedirect = await handleRedirect({
          browserTab, baseUrl, payment: paymentAfterMakePayment, getOriginKeysResponse
        })

        assertPayment(paymentAfterRedirect)
      })
  })

  async function makePayment ({
                                browserTab, baseUrl, getOriginKeysResponse,
                                creditCardNumber,
                                creditCardDate,
                                creditCardCvc, payment
                              }) {
    const makePaymentFormPage = new MakePaymentFormPage(browserTab, baseUrl)
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

    return updatedPayment
  }

  async function handleRedirect ({
                                   browserTab, baseUrl, payment, getOriginKeysResponse
                                 }) {
    const { makePaymentResponse: makePaymentResponseString } = payment.custom.fields
    const makePaymentResponse = await JSON.parse(makePaymentResponseString)

    const redirectPaymentFormPage = new RedirectPaymentFormPage(browserTab, baseUrl)
    await redirectPaymentFormPage.goToThisPage()

    await Promise.all([
      redirectPaymentFormPage.redirectToAdyenPaymentPage(getOriginKeysResponse, makePaymentResponse),
      browserTab.waitForNavigation()
    ])

    const creditCardRedirectPage = new CreditCardRedirectPage(browserTab)
    const value = await creditCardRedirectPage.finish3dsRedirectPayment()

    // Submit payment details
    const parsedQuery = querystring.parse(value)
    const { body: finalPayment } = await ctpClient.update(ctpClient.builder.payments, payment.id,
      payment.version, [{
        action: 'setCustomField',
        name: 'submitAdditionalPaymentDetailsRequest',
        value: JSON.stringify({
          details: parsedQuery
        })
      }])

    return finalPayment
  }
})
