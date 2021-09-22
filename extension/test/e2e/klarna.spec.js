const { expect } = require('chai')
const ctpClientBuilder = require('../../src/ctp')
const config = require('../../src/config/config')
const { routes } = require('../../src/routes')
const httpUtils = require('../../src/utils')

const logger = httpUtils.getLogger()
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
describe.skip('::klarnaPayment::', () => {
  let browser
  let ctpClient
  const adyenMerchantAccount = config.getAllAdyenMerchantAccounts()[0]
  const ctpProjectKey = config.getAllCtpProjectKeys()[0]

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

    const ctpConfig = config.getCtpConfig(ctpProjectKey)
    ctpClient = ctpClientBuilder.get(ctpConfig)
    browser = await initPuppeteerBrowser()
  })

  afterEach(async () => {
    await browser.close()
  })

  it(
    'when payment method is klarna and process is done correctly, ' +
      'then it should successfully finish the payment',
    async () => {
      let paymentAfterCapture
      try {
        const baseUrl = config.getModuleConfig().apiExtensionBaseUrl
        const clientKey = config.getAdyenConfig(adyenMerchantAccount).clientKey
        const payment = await createPayment(
          ctpClient,
          adyenMerchantAccount,
          ctpProjectKey
        )

        const browserTab = await browser.newPage()
        logger.debug('klarna::payment:', JSON.stringify(payment))
        const paymentAfterMakePayment = await makePayment({
          browserTab,
          baseUrl,
          payment,
          clientKey,
        })
        logger.debug(
          'klarna::paymentAfterMakePayment:',
          JSON.stringify(paymentAfterMakePayment)
        )
        const paymentAfterHandleRedirect = await handleRedirect({
          browserTab,
          baseUrl,
          payment: paymentAfterMakePayment,
        })
        logger.debug(
          'klarna::paymentAfterHandleRedirect:',
          JSON.stringify(paymentAfterHandleRedirect)
        )
        assertPayment(paymentAfterHandleRedirect)

        // Capture the payment
        paymentAfterCapture = await capturePayment({
          payment: paymentAfterHandleRedirect,
        })
        logger.debug(
          'klarna::paymentAfterCapture:',
          JSON.stringify(paymentAfterCapture)
        )
      } catch (err) {
        logger.error('klarna::errors', JSON.stringify(err))
      }
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
    let result = null
    const startTime = new Date().getTime()
    try {
      result = await ctpClient.update(
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
    } finally {
      const endTime = new Date().getTime()
      logger.debug('klarna::makePayment:', endTime - startTime)
    }
    return result.body
  }

  async function handleRedirect({ browserTab, baseUrl, payment }) {
    const { makePaymentResponse: makePaymentResponseString } =
      payment.custom.fields
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

    // Set 10 seconds to process Klarna Page
    await browserTab.waitForTimeout(10_000)
    const klarnaPage = new KlarnaPage(browserTab)

    await Promise.all([
      klarnaPage.finishKlarnaPayment(),
      browserTab.waitForSelector('#redirect-response'),
    ])

    // Submit payment details
    const returnPageUrl = new URL(browserTab.url())
    const searchParamsJson = Object.fromEntries(returnPageUrl.searchParams)
    let result = null
    const startTime = new Date().getTime()
    try {
      result = await ctpClient.update(
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
    } finally {
      const endTime = new Date().getTime()
      logger.debug('klarna::handleRedirect:', endTime - startTime)
    }
    return result.body
  }

  async function capturePayment({ payment }) {
    const transaction = payment.transactions[0]
    let result = null
    const startTime = new Date().getTime()
    try {
      result = await ctpClient.update(
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
    } finally {
      const endTime = new Date().getTime()
      logger.debug('klarna::capturePayment:', endTime - startTime)
    }
    return result.body
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

    const chargePendingTransaction =
      pU.getChargeTransactionPending(paymentAfterCapture)
    expect(chargePendingTransaction.interactionId).to.equal(
      manualCaptureResponse.pspReference
    )
  }
})
