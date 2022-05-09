import { expect } from 'chai'
import ctpClientBuilder from '../../src/ctp.js'
import config from '../../src/config/config.js'
import { routes } from '../../src/routes.js'
import httpUtils from '../../src/utils.js'
import {
  createAddTransactionAction,
  getLatestInterfaceInteraction,
  getChargeTransactionPending,
} from '../../src/paymentHandler/payment-utils.js'
import testUtils from './e2e-test-utils.js'
import KlarnaMakePaymentFormPage from './pageObjects/KlarnaMakePaymentFormPage.js'
import RedirectPaymentFormPage from './pageObjects/RedirectPaymentFormPage.js'
import KlarnaPage from './pageObjects/KlarnaPage.js'
import constants from '../../src/config/constants.js'

const { CTP_INTERACTION_TYPE_MANUAL_CAPTURE } = constants
const { assertPayment, createPayment, initPuppeteerBrowser, serveFile } =
  testUtils
const logger = httpUtils.getLogger()

// Flow description: https://docs.adyen.com/payment-methods/klarna/web-component#page-introduction
describe('::klarnaPayment::', () => {
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

        const browserTab = await browser.newPage()
        const paymentAfterMakePayment = await makePayment({
          browserTab,
          baseUrl,
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
        logger.error('klarna::errors', err)
      }
      assertManualCaptureResponse(paymentAfterCapture)
    }
  )

  async function makePayment({ browserTab, baseUrl, clientKey }) {
    const makePaymentFormPage = new KlarnaMakePaymentFormPage(
      browserTab,
      baseUrl
    )
    await makePaymentFormPage.goToThisPage()
    const makePaymentRequest = await makePaymentFormPage.getMakePaymentRequest(
      clientKey
    )
    let payment = null
    const startTime = new Date().getTime()
    try {
      payment = await createPayment(
        ctpClient,
        adyenMerchantAccount,
        ctpProjectKey,
        makePaymentRequest
      )
    } catch (err) {
      logger.error('klarna::makePaymentRequest::errors', JSON.stringify(err))
    } finally {
      const endTime = new Date().getTime()
      logger.debug(
        'klarna::makePayment::elapsedMilliseconds:',
        endTime - startTime
      )
    }
    return payment
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
    await redirectPaymentFormPage.redirectToAdyenPaymentPage(
      makePaymentResponse
    )
    await browserTab.waitForSelector('#buy-button:not([disabled])')

    const klarnaPage = new KlarnaPage(browserTab)
    await klarnaPage.finishKlarnaPayment()
    await browserTab.waitForSelector('#redirect-response')

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
    } catch (err) {
      logger.error(
        'klarna::submitAdditionalPaymentDetailsRequest::errors',
        JSON.stringify(err)
      )
    } finally {
      const endTime = new Date().getTime()
      logger.debug(
        'klarna::handleRedirect::elapsedMilliseconds:',
        endTime - startTime
      )
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
          createAddTransactionAction({
            type: 'Charge',
            state: 'Initial',
            currency: transaction.amount.currencyCode,
            amount: transaction.amount.centAmount,
          }),
        ]
      )
    } catch (err) {
      logger.error('klarna::capturePaymentRequest::errors', JSON.stringify(err))
    } finally {
      const endTime = new Date().getTime()
      logger.debug(
        'klarna::capturePayment::elapsedMilliseconds:',
        endTime - startTime
      )
    }
    return result.body
  }

  function assertManualCaptureResponse(paymentAfterCapture) {
    const interfaceInteraction = getLatestInterfaceInteraction(
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
      getChargeTransactionPending(paymentAfterCapture)
    expect(chargePendingTransaction.interactionId).to.equal(
      manualCaptureResponse.pspReference
    )
  }
})
