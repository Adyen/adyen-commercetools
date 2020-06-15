const puppeteer = require('puppeteer')
const nodeStatic = require('node-static')
const { expect } = require('chai')
const iTSetUp = require('../integration/integration-test-set-up')
const ctpClientBuilder = require('../../src/ctp/ctp-client')
const { routes } = require('../../src/routes')
const c = require('../../src/config/constants')
const httpUtils = require('../../src/utils')
const { pasteValue } = require('./e2e-test-utils')

describe('klarna-payment', () => {
  let browser
  let ctpClient

  // note: ngrok should be restarted for every test case, otherwise there will be
  // 429 Too Many Requests error. This is due to the limit of maximum opened HTTP connections,
  // which is 40 connections at the same time.
  beforeEach(async () => {
    const fileServer = new nodeStatic.Server()
    routes['/make-payment-form'] = async (request, response) => {
      fileServer.serveFile('./test/e2e/fixtures/klarna-make-payment-form.html', 200, {}, request, response)
    }
    routes['/identify-shopper-form'] = async (request, response) => {
      fileServer.serveFile('./test/e2e/fixtures/3ds-v2-identify-shopper-form.html', 200, {}, request, response)
    }
    routes['/redirect-payment-form'] = async (request, response) => {
      fileServer.serveFile('./test/e2e/fixtures/redirect-payment-form.html', 200, {}, request, response)
    }
    routes['/return-url'] = async (request, response) => httpUtils.sendResponse({
      response,
      headers: {
        'Content-Type': 'text/html'
      },
      data: '<!DOCTYPE html><html><head></head>'
        + '<body id=redirect-response>' +
        'This is a return page to show users after they finish the payment' +
        '</body></html>'
    })

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

  it('when payment method is klarna and process is done correctly, ' +
    'it should successfully finish the payment', async function () {
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
    await page.waitFor(3000)

    await page.click('.adyen-checkout__button--pay')

    const makePaymentRequestTextArea = await page.$('#adyen-make-payment-request')
    const makePaymentRequest = await (await makePaymentRequestTextArea.getProperty('innerHTML')).jsonValue()
    const { body: updatedPayment } = await ctpClient.update(ctpClient.builder.payments, payment.id,
      payment.version, [{
        action: 'setCustomField',
        name: 'makePaymentRequest',
        value: makePaymentRequest
      }])

    const { makePaymentResponse: makePaymentResponseString } = updatedPayment.custom.fields
    const makePaymentResponse = await JSON.parse(makePaymentResponseString)

    await page.goto(`${baseUrl}/redirect-payment-form`)
    await pasteValue(page, '#adyen-origin-key', getOriginKeysResponse.originKeys[baseUrl])
    await pasteValue(page, '#adyen-make-payment-response-action-field',
      JSON.stringify(makePaymentResponse.action))

    await Promise.all([
      page.click('#redirect-payment-button'),
      page.waitForSelector('#buy-button:not([disabled])')
    ])

    await page.click('#buy-button')

    const confirmationFrame = page.frames().find(f => f.name() === 'klarna-hpp-instance-fullscreen')

    await confirmationFrame.waitForSelector('#direct-debit-mandate-review__bottom button')

    await Promise.all([
      confirmationFrame.click('#direct-debit-mandate-review__bottom button'),
      page.waitForSelector('#redirect-response')
    ])

    const returnPageUrl = new URL(page.url())
    const searchParamsJson = Object.fromEntries(returnPageUrl.searchParams)

    const { body: updatedPayment2 } = await ctpClient.update(ctpClient.builder.payments, payment.id,
      updatedPayment.version, [{
        action: 'setCustomField',
        name: 'submitAdditionalPaymentDetailsRequest',
        value: JSON.stringify({
          details: searchParamsJson
        })
      }])

    const { submitAdditionalPaymentDetailsResponse: submitAdditionalPaymentDetailsResponseString }
      = updatedPayment2.custom.fields
    const submitAdditionalPaymentDetailsResponse = await JSON.parse(submitAdditionalPaymentDetailsResponseString)

    expect(submitAdditionalPaymentDetailsResponse.resultCode).to.equal('Authorised',
      `resultCode is not Authorised: ${submitAdditionalPaymentDetailsResponseString}`)
    expect(submitAdditionalPaymentDetailsResponse.pspReference).to.match(/[A-Z0-9]+/,
      `pspReference does not match '/[A-Z0-9]+/': ${submitAdditionalPaymentDetailsResponseString}`)

    const submitAdditionalPaymentDetailsInteraction = updatedPayment2.interfaceInteractions
      .find(i => i.fields.type === 'submitAdditionalPaymentDetails')
    expect(submitAdditionalPaymentDetailsInteraction.fields.response)
      .to.equal(submitAdditionalPaymentDetailsResponseString)


    expect(updatedPayment2.transactions).to.have.lengthOf(1)
    const transaction = updatedPayment2.transactions[0]
    expect(transaction.state).to.equal(c.CTP_TXN_STATE_SUCCESS)
    expect(transaction.type).to.equal('Authorization')
    expect(transaction.interactionId).to.equal(submitAdditionalPaymentDetailsResponse.pspReference)
    expect(transaction.amount.centAmount).to.equal(updatedPayment2.amountPlanned.centAmount)
    expect(transaction.amount.currencyCode).to.equal(updatedPayment2.amountPlanned.currencyCode)

    const { body: updatedPayment3 } = await ctpClient.update(ctpClient.builder.payments, payment.id,
      updatedPayment2.version, [{
        action: 'setCustomField',
        name: 'manualCaptureRequest',
        value: JSON.stringify({
          modificationAmount: {
            value: transaction.amount.centAmount,
            currency: transaction.amount.currencyCode
          },
          originalReference: submitAdditionalPaymentDetailsResponse.pspReference,
          reference: 'YOUR_UNIQUE_REFERENCE'
        })
      }])

    const { manualCaptureResponse: manualCaptureResponseString }
      = updatedPayment3.custom.fields
    const manualCaptureResponse = await JSON.parse(manualCaptureResponseString)
    expect(manualCaptureResponse.response).to.equal('[capture-received]',
      `response is not [capture-received]: ${manualCaptureResponse}`)
    expect(manualCaptureResponse.pspReference).to.match(/[A-Z0-9]+/,
      `pspReference does not match '/[A-Z0-9]+/': ${manualCaptureResponse}`)
  })
})
