const { expect } = require('chai')
const iTSetUp = require('../integration/integration-test-set-up')
const ctpClientBuilder = require('../../src/ctp')
const configBuilder = require('../../src/config/config')
const { routes } = require('../../src/routes')
const httpUtils = require('../../src/utils')
const pU = require('../../src/paymentHandler/payment-utils')
const {
  assertPayment,
  createPayment,
  initPuppeteerBrowser,
  serveFile,
} = require('./e2e-test-utils')
const KlarnaMakePaymentFormPage = require('./pageObjects/KlarnaMakePaymentFormPage')
const RedirectPaymentFormPage = require('./pageObjects/RedirectPaymentFormPage')
const KlarnaPage = require('./pageObjects/KlarnaPage')
const {
  CTP_INTERACTION_TYPE_MANUAL_CAPTURE,
} = require('../../src/config/constants')

// Flow description: https://docs.adyen.com/payment-methods/klarna/web-component#page-introduction
describe('::klarnaPayment::', () => {
  let browser
  let ctpClient

  beforeEach(async () => {
    routes['/make-payment-form'] = async (request, response) => {
      serveFile(
        './test/e2e/fixtures/klarna-make-payment-form.html',
        request,
        response
      )
    }
    routes['/redirect-payment-form'] = async (request, response) => {
      serveFile(
        './test/e2e/fixtures/redirect-payment-form.html',
        request,
        response
      )
    }
    routes['/return-url'] = async (request, response) =>
      httpUtils.sendResponse({
        response,
        headers: {
          'Content-Type': 'text/html',
        },
        data:
          '<!DOCTYPE html><html><head></head>' +
          '<body id=redirect-response>' +
          'This is a return page to show users after they finish the payment' +
          '</body></html>',
      })

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

  it(
    'when payment method is klarna and process is done correctly, ' +
      'then it should successfully finish the payment',
    async function () {
      this.timeout(60000)

      const config = configBuilder.load()
      const baseUrl = config.apiExtensionBaseUrl
      const clientKey = config.adyen.clientKey
      const payment = await createPayment(ctpClient, baseUrl)

      const browserTab = await browser.newPage()

      const paymentAfterMakePayment = await makePayment({
        browserTab,
        baseUrl,
        payment,
        clientKey,
      })

      const paymentAfterHandleRedirect = await handleRedirect({
        browserTab,
        baseUrl,
        payment: paymentAfterMakePayment,
      })

      assertPayment(paymentAfterHandleRedirect)

      // Capture the payment
      const paymentAfterCapture = await capturePayment({
        payment: paymentAfterHandleRedirect,
      })

      assertManualCaptureResponse(paymentAfterCapture)
    }
  )

  async function makePayment({ browserTab, baseUrl, payment, clientKey }) {
    const makePaymentFormPage = new KlarnaMakePaymentFormPage(
      browserTab,
      baseUrl
    )
    await makePaymentFormPage.goToThisPage()
    const makePaymentRequest = await makePaymentFormPage.getMakePaymentRequest(
      clientKey
    )

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

    // Redirect to Klarna page
    const redirectPaymentFormPage = new RedirectPaymentFormPage(
      browserTab,
      baseUrl
    )
    await redirectPaymentFormPage.goToThisPage()
    await Promise.all([
      redirectPaymentFormPage.redirectToAdyenPaymentPage(makePaymentResponse),
      browserTab.waitForSelector('#buy-button:not([disabled])'),
    ])

    const klarnaPage = new KlarnaPage(browserTab)

    await Promise.all([
      klarnaPage.finishKlarnaPayment(),
      browserTab.waitForSelector('#redirect-response'),
    ])

    // Submit payment details
    const returnPageUrl = new URL(browserTab.url())
    const searchParamsJson = Object.fromEntries(returnPageUrl.searchParams)

    const { body: updatedPayment } = await ctpClient.update(
      ctpClient.builder.payments,
      payment.id,
      payment.version,
      [
        {
          action: 'setCustomField',
          name: 'submitAdditionalPaymentDetailsRequest',
          value: JSON.stringify({
            details: searchParamsJson,
          }),
        },
      ]
    )

    return updatedPayment
  }

  async function capturePayment({ payment }) {
    const transaction = payment.transactions[0]
    const { body: updatedPayment } = await ctpClient.update(
      ctpClient.builder.payments,
      payment.id,
      payment.version,
      [
        pU.createAddTransactionAction({
          type: 'Charge',
          state: 'Initial',
          currency: transaction.amount.currencyCode,
          amount: transaction.amount.centAmount,
        }),
      ]
    )

    return updatedPayment
  }

  function assertManualCaptureResponse(paymentAfterCapture) {
    const interfaceInteraction = pU.getLatestInterfaceInteraction(
      paymentAfterCapture.interfaceInteractions,
      CTP_INTERACTION_TYPE_MANUAL_CAPTURE
    )
    const manualCaptureResponse = JSON.parse(
      interfaceInteraction.fields.response
    )
    expect(manualCaptureResponse.response).to.equal(
      '[capture-received]',
      `response is not [capture-received]: ${manualCaptureResponse}`
    )
    expect(manualCaptureResponse.pspReference).to.match(
      /[A-Z0-9]+/,
      `pspReference does not match '/[A-Z0-9]+/': ${manualCaptureResponse}`
    )

    const chargePendingTransaction = pU.getChargeTransactionPending(
      paymentAfterCapture
    )
    expect(chargePendingTransaction.interactionId).to.equal(
      manualCaptureResponse.pspReference
    )
  }
})
