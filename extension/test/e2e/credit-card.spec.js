const puppeteer = require('puppeteer')
const nodeStatic = require('node-static')
const { expect } = require('chai')
const iTSetUp = require('../integration/integration-test-set-up')
const ctpClientBuilder = require('../../src/ctp/ctp-client')
const { routes } = require('../../src/routes')
const c = require('../../src/config/constants')
const MakePaymentFormPage = require('./pageObjects/CreditCardMakePaymentFormPage')
const { assertPayment } = require('./e2e-test-utils')

// Flow description: https://docs.adyen.com/checkout/components-web
describe('credit-card-payment', () => {
  let browser
  let ctpClient

  // See more: https://docs.adyen.com/development-resources/test-cards/test-card-numbers
  const creditCards = [
    { name: 'American Express', creditCardNumber: '3700 0000 0000 002', creditCardCvc: '7373' },
    { name: 'Cartes Bancaires', creditCardNumber: '4035 5010 0000 0008' },
    {
      name: 'China UnionPay ExpressPay',
      creditCardNumber: '8171 9999 2766 0000',
      creditCardDate: '10/30'
    },
    { name: 'Dankort', creditCardNumber: '5019 5555 4444 5555' },
    { name: 'Diners', creditCardNumber: '3600 6666 3333 44' },
    { name: 'Discover', creditCardNumber: '6011 6011 6011 6611' },
    { name: 'Elo', creditCardNumber: '5066 9911 1111 1118' },
    { name: 'Hipercard', creditCardNumber: '6062 8288 8866 6688' },
    { name: 'JCB', creditCardNumber: '3569 9900 1009 5841' },
    { name: 'Mastercard', creditCardNumber: '5101 1800 0000 0007' },
    { name: 'UATP', creditCardNumber: '1354 1001 4004 955', creditCardDate: '06/22' },
    { name: 'VISA', creditCardNumber: '4166 6766 6766 6746' },
    { name: 'Visa Electron', creditCardNumber: '4001 0200 0000 0009' },
    { name: 'V Pay', creditCardNumber: '4013 2500 0000 0000 006' },
  ]

  // note: ngrok should be restarted for every test case, otherwise there will be
  // 429 Too Many Requests error. This is due to the limit of maximum opened HTTP connections,
  // which is 40 connections at the same time.
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
