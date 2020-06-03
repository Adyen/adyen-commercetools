const puppeteer = require('puppeteer')
const nodeStatic = require('node-static')
const itParam = require('mocha-param')
const { expect } = require('chai')
const iTSetUp = require('../integration/integration-test-set-up')
const ctpClientBuilder = require('../../src/ctp/ctp-client')
const { routes } = require('../../src/routes')
const c = require('../../src/config/constants')


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

  before(async () => {
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

  after(async () => {
    await iTSetUp.cleanupResources()
    await browser.close()
  })

  // eslint-disable-next-line no-template-curly-in-string
  itParam('when issuer is ${value.name} and number is ${value.creditCardNumber}, ' +
    'it should successfully finish the payment with credit card',
    creditCards,
    async ({ creditCardNumber, creditCardDate = '03/30', creditCardCvc = '737' }) => {
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

      await page.goto(`${baseUrl}/make-payment-form`)
      await page.type('#adyen-origin-key', getOriginKeysResponse.originKeys[baseUrl])
      await page.$eval('#adyen-origin-key', e => e.blur())
      await page.waitFor(2000)
      await executeInAdyenIframe(page, '#encryptedCardNumber', el => el.type(creditCardNumber))
      await executeInAdyenIframe(page, '#encryptedExpiryDate', el => el.type(creditCardDate))
      await executeInAdyenIframe(page, '#encryptedSecurityCode', el => el.type(creditCardCvc))
      await page.click('.adyen-checkout__button--pay')
      const makePaymentRequestTextArea = await page.$('#adyen-make-payment-request')
      const makePaymentRequest = await (await makePaymentRequestTextArea.getProperty('innerHTML')).jsonValue()
      const { body: updatedPayment } = await ctpClient.update(ctpClient.builder.payments, payment.id, payment.version, [
        { action: 'setCustomField', name: 'makePaymentRequest', value: makePaymentRequest }
      ])

      const { makePaymentResponse: makePaymentResponseString } = updatedPayment.custom.fields
      const makePaymentResponse = await JSON.parse(makePaymentResponseString)
      expect(makePaymentResponse.resultCode).to.equal('Authorised',
        `resultCode is not Authorised: ${makePaymentResponseString}`)
      expect(makePaymentResponse.pspReference).to.match(/[A-Z0-9]+/,
        `pspReference does not match '/[A-Z0-9]+/': ${ makePaymentResponseString}`)

      expect(updatedPayment.transactions).to.have.lengthOf(1)
      const transaction = updatedPayment.transactions[0]
      expect(transaction.state).to.equal(c.CTP_TXN_STATE_SUCCESS)
      expect(transaction.type).to.equal('Authorization')
      expect(transaction.interactionId).to.equal(makePaymentResponse.pspReference)
      expect(transaction.amount.centAmount).to.equal(updatedPayment.amountPlanned.centAmount)
      expect(transaction.amount.currencyCode).to.equal(updatedPayment.amountPlanned.currencyCode)
    })

  async function executeInAdyenIframe (page, selector, executeFn) {
    for (const frame of page.mainFrame().childFrames()) {
      const elementHandle = await frame.$(selector)
      if (elementHandle) {
        await executeFn(elementHandle)
        break
      }
    }
  }
})
