const puppeteer = require('puppeteer')
const nodeStatic = require('node-static')
const { expect } = require('chai')
const querystring = require('querystring')
const iTSetUp = require('../integration/integration-test-set-up')
const ctpClientBuilder = require('../../src/ctp/ctp-client')
const { routes } = require('../../src/routes')
const c = require('../../src/config/constants')
const httpUtils = require('../../src/utils')
const { assertPayment } = require('./e2e-test-utils')
const MakePaymentFormPage = require('./pageObjects/CreditCardMakePaymentFormPage')
const RedirectPaymentFormPage = require('./pageObjects/RedirectPaymentFormPage')
const CreditCardRedirectPage = require('./pageObjects/CreditCardRedirectPage')

// Flow description: https://docs.adyen.com/checkout/3d-secure/redirect-3ds2-3ds1/web-component
describe('credit-card-payment-redirect', () => {
  let browser
  let ctpClient

  // See more: https://docs.adyen.com/development-resources/test-cards/test-card-numbers
  const creditCards = [
    {
      name: 'American Express',
      creditCardNumber: '3451 7792 5488 348',
      creditCardCvc: '7373'
    },
    {
      name: 'International',
      creditCardNumber: '6731 0123 4567 8906'
    },
    {
      name: 'JCB',
      creditCardNumber: '3569 9900 1009 5833'
    },
    {
      name: 'Maestro',
      creditCardNumber: '6771 8309 9999 1239'
    },
    {
      name: 'Maestro',
      creditCardNumber: '6771 8300 0000 0000 006'
    },
    {
      name: 'Mastercard',
      creditCardNumber: '5212 3456 7890 1234'
    },
    {
      name: 'Visa',
      creditCardNumber: '4212 3456 7890 1237'
    }
  ]

  // note: ngrok should be restarted for every test case, otherwise there will be
  // 429 Too Many Requests error. This is due to the limit of maximum opened HTTP connections,
  // which is 40 connections at the same time.
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
                         name, creditCardNumber, creditCardDate = '10/20', creditCardCvc = '737'
                       }) => {
    // eslint-disable-next-line no-template-curly-in-string
    it(`when issuer is ${name} and number is ${creditCardNumber}, ` +
      'it should successfully finish the payment with credit card',
      async () => {
        const page = await browser.newPage()
        const baseUrl = process.env.API_EXTENSION_BASE_URL

        const getOriginKeysRequestDraft = {
          originDomains: [
            baseUrl
          ]
        }
        const paymentDraft = {
          amountPlanned: {
            currencyCode: 'EUR',
            centAmount: 1000,
          },
          paymentMethodInfo: {
            paymentInterface: c.CTP_ADYEN_INTEGRATION
          },
          custom: {
            type: {
              typeId: 'type',
              key: c.CTP_PAYMENT_CUSTOM_TYPE_KEY
            },
            fields: {
              getOriginKeysRequest: JSON.stringify(getOriginKeysRequestDraft)
            }
          }
        }

        const { body: payment } = await ctpClient.create(ctpClient.builder.payments, paymentDraft)
        const { getOriginKeysResponse: getOriginKeysResponseString } = payment.custom.fields
        const getOriginKeysResponse = await JSON.parse(getOriginKeysResponseString)

        // Make payment
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

        // Redirect payment to the payment provider
        const { makePaymentResponse: makePaymentResponseString } = updatedPayment.custom.fields
        const makePaymentResponse = await JSON.parse(makePaymentResponseString)

        const redirectPaymentFormPage = new RedirectPaymentFormPage(page, baseUrl)
        await redirectPaymentFormPage.goToThisPage()

        await Promise.all([
          redirectPaymentFormPage.redirectToAdyenPaymentPage(getOriginKeysResponse, makePaymentResponse),
          page.waitForNavigation()
        ])

        const creditCardRedirectPage = new CreditCardRedirectPage(page, baseUrl)
        const value = await creditCardRedirectPage.finishRedirectPayment()

        // Submit payment details
        const parsedQuery = querystring.parse(value)
        const { body: finalPayment } = await ctpClient.update(ctpClient.builder.payments, payment.id,
          updatedPayment.version, [{
            action: 'setCustomField',
            name: 'submitAdditionalPaymentDetailsRequest',
            value: JSON.stringify({
              details: parsedQuery
            })
          }])

        assertPayment(finalPayment)
      })
  })
})
