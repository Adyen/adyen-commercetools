const querystring = require('querystring')
const iTSetUp = require('../integration/integration-test-set-up')
const ctpClientBuilder = require('../../src/ctp')
const configBuilder = require('../../src/config/config')
const { routes } = require('../../src/routes')
const httpUtils = require('../../src/utils')
const {
  assertPayment,
  createPayment,
  initPuppeteerBrowser,
  serveFile,
} = require('./e2e-test-utils')
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
      creditCardNumber: '5212 3456 7890 1234',
    },
    {
      name: 'Visa',
      creditCardNumber: '4212 3456 7890 1237',
    },
  ]

  beforeEach(async () => {
    routes['/make-payment-form'] = async (request, response) => {
      serveFile('./test/e2e/fixtures/make-payment-form.html', request, response)
    }
    routes['/redirect-payment-form'] = async (request, response) => {
      serveFile(
        './test/e2e/fixtures/redirect-payment-form.html',
        request,
        response
      )
    }
    routes['/return-url'] = async (request, response) => {
      const body = await httpUtils.collectRequestData(request)
      return httpUtils.sendResponse({
        response,
        headers: {
          'Content-Type': 'text/html',
        },
        data:
          '<!DOCTYPE html><html><head></head>' +
          `<body><div id=redirect-response>${body}</div></body></html>`,
      })
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
          'then it should successfully finish the payment with 3DS redirect flow',
        async () => {
          const config = configBuilder.load()
          const baseUrl = config.apiExtensionBaseUrl
          const clientKey = config.adyen.clientKey
          const payment = await createPayment(ctpClient, baseUrl)

          const browserTab = await browser.newPage()

          const paymentAfterMakePayment = await makePayment({
            browserTab,
            baseUrl,
            creditCardNumber,
            creditCardDate,
            creditCardCvc,
            payment,
            clientKey,
          })

          const paymentAfterRedirect = await handleRedirect({
            browserTab,
            baseUrl,
            payment: paymentAfterMakePayment,
          })

          assertPayment(paymentAfterRedirect)
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
    payment,
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

  async function handleRedirect({ browserTab, baseUrl, payment }) {
    const {
      makePaymentResponse: makePaymentResponseString,
    } = payment.custom.fields
    const makePaymentResponse = await JSON.parse(makePaymentResponseString)

    const redirectPaymentFormPage = new RedirectPaymentFormPage(
      browserTab,
      baseUrl
    )
    await redirectPaymentFormPage.goToThisPage()

    await Promise.all([
      redirectPaymentFormPage.redirectToAdyenPaymentPage(makePaymentResponse),
      browserTab.waitForNavigation(),
    ])

    const creditCardRedirectPage = new CreditCardRedirectPage(browserTab)
    const value = await creditCardRedirectPage.finish3dsRedirectPayment()

    // Submit payment details
    const parsedQuery = querystring.parse(value)
    const { body: finalPayment } = await ctpClient.update(
      ctpClient.builder.payments,
      payment.id,
      payment.version,
      [
        {
          action: 'setCustomField',
          name: 'submitAdditionalPaymentDetailsRequest',
          value: JSON.stringify({
            details: parsedQuery,
          }),
        },
      ]
    )

    return finalPayment
  }
})
