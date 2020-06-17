const puppeteer = require('puppeteer')
const nodeStatic = require('node-static')
const { expect } = require('chai')
const iTSetUp = require('../integration/integration-test-set-up')
const ctpClientBuilder = require('../../src/ctp/ctp-client')
const { routes } = require('../../src/routes')
const httpUtils = require('../../src/utils')
const { assertPayment, createPaymentWithOriginKeyResponse } = require('./e2e-test-utils')
const KlarnaMakePaymentFormPage = require('./pageObjects/KlarnaMakePaymentFormPage')
const RedirectPaymentFormPage = require('./pageObjects/RedirectPaymentFormPage')
const KlarnaPage = require('./pageObjects/KlarnaPage')

// Flow description: https://docs.adyen.com/payment-methods/klarna/web-component#page-introduction
describe('::klarnaPayment::', () => {
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
    'it should successfully finish the payment', async () => {
    const baseUrl = process.env.API_EXTENSION_BASE_URL
    const payment = await createPaymentWithOriginKeyResponse(ctpClient, baseUrl)
    const { getOriginKeysResponse: getOriginKeysResponseString } = payment.custom.fields
    const getOriginKeysResponse = await JSON.parse(getOriginKeysResponseString)

    const page = await browser.newPage()
    // Make payment
    const makePaymentFormPage = new KlarnaMakePaymentFormPage(page, baseUrl)
    await makePaymentFormPage.goToThisPage()
    const makePaymentRequest = await makePaymentFormPage.getMakePaymentRequest({ getOriginKeysResponse })

    const { body: updatedPayment } = await ctpClient.update(ctpClient.builder.payments, payment.id,
      payment.version, [{
        action: 'setCustomField',
        name: 'makePaymentRequest',
        value: makePaymentRequest
      }])

    const { makePaymentResponse: makePaymentResponseString } = updatedPayment.custom.fields
    const makePaymentResponse = await JSON.parse(makePaymentResponseString)

    // Redirect to Klarna page
    const redirectPaymentFormPage = new RedirectPaymentFormPage(page, baseUrl)
    await redirectPaymentFormPage.goToThisPage()
    await Promise.all([
      redirectPaymentFormPage.redirectToAdyenPaymentPage(getOriginKeysResponse, makePaymentResponse),
      page.waitForSelector('#buy-button:not([disabled])')
    ])

    const klarnaPage = new KlarnaPage(page, baseUrl)

    await Promise.all([
      klarnaPage.finishKlarnaPayment(),
      page.waitForSelector('#redirect-response')
    ])

    // Submit payment details
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

    assertPayment(updatedPayment2)

    // Capture the payment
    const transaction = updatedPayment2.transactions[0]
    const { submitAdditionalPaymentDetailsResponse: submitAdditionalPaymentDetailsResponseString }
      = updatedPayment2.custom.fields
    const submitAdditionalPaymentDetailsResponse = JSON.parse(submitAdditionalPaymentDetailsResponseString)
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

    const { manualCaptureResponse: manualCaptureResponseString } = updatedPayment3.custom.fields
    assertManualCaptureResponse(manualCaptureResponseString)
  })

  function assertManualCaptureResponse (manualCaptureResponseString) {
    const manualCaptureResponse = JSON.parse(manualCaptureResponseString)
    expect(manualCaptureResponse.response).to.equal('[capture-received]',
      `response is not [capture-received]: ${manualCaptureResponse}`)
    expect(manualCaptureResponse.pspReference).to.match(/[A-Z0-9]+/,
      `pspReference does not match '/[A-Z0-9]+/': ${manualCaptureResponse}`)
  }
})
