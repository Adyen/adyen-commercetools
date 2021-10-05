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
const AffirmMakePaymentFormPage = require('./pageObjects/AffirmMakePaymentFormPage')
const RedirectPaymentFormPage = require('./pageObjects/RedirectPaymentFormPage')
const AffirmPage = require('./pageObjects/AffirmPage')
const {
  CTP_INTERACTION_TYPE_MANUAL_CAPTURE,
} = require('../../src/config/constants')

// Flow description: https://docs.adyen.com/payment-methods/affirm/web-component#page-introduction
describe('::affirmPayment::', () => {
  let browser
  let ctpClient
  const adyenMerchantAccount = config.getAllAdyenMerchantAccounts()[0]
  const ctpProjectKey = config.getAllCtpProjectKeys()[0]

  beforeEach(async () => {
    routes['/make-payment-form'] = async (request, response) => {
      serveFile(
        './test/e2e/fixtures/affirm-make-payment-form.html',
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
    'when payment method is affirm and process is done correctly, ' +
      'then it should successfully finish the payment',
    async () => {
      const baseUrl = config.getModuleConfig().apiExtensionBaseUrl
      const clientKey = config.getAdyenConfig(adyenMerchantAccount).clientKey
      try {
        const payment = await createPayment(
          ctpClient,
          adyenMerchantAccount,
          ctpProjectKey,
          'USD'
        )
        logger.debug('affirm::payment:', JSON.stringify(payment))
        const browserTab = await browser.newPage()

        const paymentAfterMakePayment = await makePayment({
          browserTab,
          baseUrl,
          payment,
          clientKey,
        })
        logger.debug(
          'affirm::paymentAfterMakePayment:',
          JSON.stringify(paymentAfterMakePayment)
        )
        const paymentAfterHandleRedirect = await handleRedirect({
          browserTab,
          baseUrl,
          payment: paymentAfterMakePayment,
        })
        logger.debug(
          'affirm::paymentAfterHandleRedirect:',
          JSON.stringify(paymentAfterHandleRedirect)
        )
        assertPayment(paymentAfterHandleRedirect)

        // Capture the payment
        const paymentAfterCapture = await capturePayment({
          payment: paymentAfterHandleRedirect,
        })
        logger.debug(
          'affirm::paymentAfterCapture:',
          JSON.stringify(paymentAfterCapture)
        )
        assertManualCaptureResponse(paymentAfterCapture)
      } catch (err) {
        logger.error('affirm::errors', err)
      }
    }
  )

  async function makePayment({ browserTab, baseUrl, payment, clientKey }) {
    const makePaymentFormPage = new AffirmMakePaymentFormPage(
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
    } catch (err) {
      logger.error('affirm::makePaymentRequest::errors', JSON.stringify(err))
    } finally {
      const endTime = new Date().getTime()
      logger.debug(
        'affirm::makePayment::elapsedMilliseconds:',
        endTime - startTime
      )
    }
    return result.body
  }

  async function handleRedirect({ browserTab, baseUrl, payment }) {
    const { makePaymentResponse: makePaymentResponseString } =
      payment.custom.fields
    const makePaymentResponse = await JSON.parse(makePaymentResponseString)

    // Redirect to Affirm page
    const redirectPaymentFormPage = new RedirectPaymentFormPage(
      browserTab,
      baseUrl
    )
    await redirectPaymentFormPage.goToThisPage()
    await Promise.all([
      redirectPaymentFormPage.redirectToAdyenPaymentPage(makePaymentResponse),
      browserTab.waitForSelector('.propvHOJQwT:not([disabled])'),
    ])

    const affirmPage = new AffirmPage(browserTab)

    await Promise.all([
      affirmPage.finishAffirmPayment(),
      browserTab.waitForSelector('#redirect-response'),
    ])

    // Submit payment details
    const returnPageUrl = new URL(browserTab.url())
    const searchParamsJson = Object.fromEntries(returnPageUrl.searchParams)
    let updatedPayment = null
    const startTime = new Date().getTime()
    try {
      updatedPayment = await ctpClient.update(
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
    } catch (err) {
      logger.error(
        'affirm::submitAdditionalPaymentDetailsRequest::errors',
        JSON.stringify(err)
      )
    } finally {
      const endTime = new Date().getTime()
      logger.debug(
        'affirm::submitAdditionalPaymentDetailsRequest::elapsedMilliseconds:',
        endTime - startTime
      )
    }

    return updatedPayment.body
  }

  async function capturePayment({ payment }) {
    const transaction = payment.transactions[0]
    let updatedPayment = null
    const startTime = new Date()
    try {
      updatedPayment = await ctpClient.update(
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
    } catch (err) {
      logger.error('affirm::capturePaymentRequest::errors', JSON.stringify(err))
    } finally {
      const endTime = new Date().getTime()
      logger.debug(
        'affirm::capturePaymentRequest::elapsedMilliseconds:',
        endTime - startTime
      )
    }

    return updatedPayment.body
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
