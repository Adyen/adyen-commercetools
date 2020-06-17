const puppeteer = require('puppeteer')
const nodeStatic = require('node-static')
const iTSetUp = require('../integration/integration-test-set-up')
const ctpClientBuilder = require('../../src/ctp/ctp-client')
const { routes } = require('../../src/routes')
const httpUtils = require('../../src/utils')
const { assertPayment, createPaymentWithOriginKeyResponse } = require('./e2e-test-utils')
const MakePaymentFormPage = require('./pageObjects/CreditCardMakePaymentFormPage')
const RedirectPaymentFormPage = require('./pageObjects/RedirectPaymentFormPage')
const CreditCardNativePage = require('./pageObjects/CreditCard3dsNativePage')

// Flow description: https://docs.adyen.com/checkout/3d-secure/native-3ds2/web-component
describe('::creditCardPayment3dsNative::', () => {
  let browser
  let ctpClient

  // See more: https://docs.adyen.com/development-resources/test-cards/test-card-numbers
  const creditCards = [
    {
      name: 'Mastercard',
      creditCardNumber: '5454 5454 5454 5454'
    },
    {
      name: 'Visa',
      creditCardNumber: '4917 6100 0000 0000'
    }
  ]

  beforeEach(async () => {
    const fileServer = new nodeStatic.Server()
    routes['/make-payment-form'] = async (request, response) => {
      fileServer.serveFile('./test/e2e/fixtures/3ds-v2-make-payment-form.html', 200, {}, request, response)
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

        // Redirect shopper to payment provider
        const { makePaymentResponse: makePaymentResponseString } = updatedPayment.custom.fields
        const makePaymentResponse = await JSON.parse(makePaymentResponseString)
        const redirectPaymentFormPage = new RedirectPaymentFormPage(page, baseUrl)
        await redirectPaymentFormPage.goToThisPage()
        await redirectPaymentFormPage.redirectToAdyenPaymentPage(getOriginKeysResponse, makePaymentResponse)

        await page.waitFor(2000)

        const additionalPaymentDetailsInput = await page.$('#adyen-additional-payment-details')
        const additionalPaymentDetailsString = await page.evaluate(el => el.value, additionalPaymentDetailsInput)

        const { body: updatedPayment2 } = await ctpClient.update(ctpClient.builder.payments, payment.id,
          updatedPayment.version, [{
            action: 'setCustomField',
            name: 'submitAdditionalPaymentDetailsRequest',
            value: additionalPaymentDetailsString
          }])

        // Submit additional details 1
        const { submitAdditionalPaymentDetailsResponse: submitAdditionalPaymentDetailsResponseString }
          = updatedPayment2.custom.fields
        const submitAdditionalPaymentDetailsResponse1 = await JSON.parse(submitAdditionalPaymentDetailsResponseString)
        await redirectPaymentFormPage.goToThisPage()
        await redirectPaymentFormPage.redirectToAdyenPaymentPage(
          getOriginKeysResponse, submitAdditionalPaymentDetailsResponse1
        )

        await page.waitFor(2000)

        // Submit additional details 2
        const creditCardNativePage = new CreditCardNativePage(page, baseUrl)
        const additionalPaymentDetailsString2 = await creditCardNativePage.finish3dsNativePayment()
        const { body: finalPayment } = await ctpClient.update(ctpClient.builder.payments, payment.id,
          updatedPayment2.version, [
            {
              action: 'setCustomField',
              name: 'submitAdditionalPaymentDetailsRequest',
              value: additionalPaymentDetailsString2
            },
            {
              action: 'setCustomField',
              name: 'submitAdditionalPaymentDetailsResponse',
            }
          ])

        assertPayment(finalPayment)
      })
  })
})
