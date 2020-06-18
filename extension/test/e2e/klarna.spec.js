const nodeStatic = require('node-static')
const { expect } = require('chai')
const iTSetUp = require('../integration/integration-test-set-up')
const ctpClientBuilder = require('../../src/ctp/ctp-client')
const { routes } = require('../../src/routes')
const httpUtils = require('../../src/utils')
const { assertPayment, createPaymentWithOriginKeyResponse, initPuppeteerBrowser } = require('./e2e-test-utils')
const KlarnaMakePaymentFormPage = require('./pageObjects/KlarnaMakePaymentFormPage')
const RedirectPaymentFormPage = require('./pageObjects/RedirectPaymentFormPage')
const KlarnaPage = require('./pageObjects/KlarnaPage')

// Flow description: https://docs.adyen.com/payment-methods/klarna/web-component#page-introduction
describe('::klarnaPayment::', () => {
  let browser
  let ctpClient

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
    browser = await initPuppeteerBrowser()
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

    const browserTab = await browser.newPage()

    const paymentAfterMakePayment = await makePayment({
      browserTab, baseUrl, payment, getOriginKeysResponse
    })

    const paymentAfterHandleRedirect = await handleRedirect({
      browserTab, baseUrl, payment: paymentAfterMakePayment, getOriginKeysResponse
    })

    assertPayment(paymentAfterHandleRedirect)

    // Capture the payment
    const paymentAfterCapture = await capturePayment({ payment: paymentAfterHandleRedirect })

    const { manualCaptureResponse: manualCaptureResponseString } = paymentAfterCapture.custom.fields
    assertManualCaptureResponse(manualCaptureResponseString)
  })

  async function makePayment ({
                                browserTab, baseUrl, payment, getOriginKeysResponse
                              }) {
    const makePaymentFormPage = new KlarnaMakePaymentFormPage(browserTab, baseUrl)
    await makePaymentFormPage.goToThisPage()
    const makePaymentRequest = await makePaymentFormPage.getMakePaymentRequest({ getOriginKeysResponse })

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

    // Redirect to Klarna page
    const redirectPaymentFormPage = new RedirectPaymentFormPage(browserTab, baseUrl)
    await redirectPaymentFormPage.goToThisPage()
    await Promise.all([
      redirectPaymentFormPage.redirectToAdyenPaymentPage(getOriginKeysResponse, makePaymentResponse),
      browserTab.waitForSelector('#buy-button:not([disabled])')
    ])

    const klarnaPage = new KlarnaPage(browserTab)

    await Promise.all([
      klarnaPage.finishKlarnaPayment(),
      browserTab.waitForSelector('#redirect-response')
    ])

    // Submit payment details
    const returnPageUrl = new URL(browserTab.url())
    const searchParamsJson = Object.fromEntries(returnPageUrl.searchParams)

    const { body: updatedPayment } = await ctpClient.update(ctpClient.builder.payments, payment.id,
      payment.version, [{
        action: 'setCustomField',
        name: 'submitAdditionalPaymentDetailsRequest',
        value: JSON.stringify({
          details: searchParamsJson
        })
      }])

    return updatedPayment
  }

  async function capturePayment ({ payment }) {
    const transaction = payment.transactions[0]
    const { submitAdditionalPaymentDetailsResponse: submitAdditionalPaymentDetailsResponseString }
      = payment.custom.fields
    const submitAdditionalPaymentDetailsResponse = JSON.parse(submitAdditionalPaymentDetailsResponseString)
    const { body: updatedPayment } = await ctpClient.update(ctpClient.builder.payments, payment.id,
      payment.version, [{
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

    return updatedPayment
  }

  function assertManualCaptureResponse (manualCaptureResponseString) {
    const manualCaptureResponse = JSON.parse(manualCaptureResponseString)
    expect(manualCaptureResponse.response).to.equal('[capture-received]',
      `response is not [capture-received]: ${manualCaptureResponse}`)
    expect(manualCaptureResponse.pspReference).to.match(/[A-Z0-9]+/,
      `pspReference does not match '/[A-Z0-9]+/': ${manualCaptureResponse}`)
  }
})
