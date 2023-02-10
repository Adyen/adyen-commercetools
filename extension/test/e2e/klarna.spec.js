import { expect } from 'chai'
import ctpClientBuilder from '../../src/ctp.js'
import config from '../../src/config/config.js'
import { routes } from '../../src/routes.js'
import httpUtils from '../../src/utils.js'
import constants from '../../src/config/constants.js'
import {
  waitUntil,
  fetchNotificationInterfaceInteraction,
} from '../test-utils.js'
import {
  createAddTransactionAction,
  getLatestInterfaceInteraction,
  getChargeTransactionPending,
} from '../../src/paymentHandler/payment-utils.js'
import {
  createPaymentSession,
  getCreateSessionRequest,
  initPuppeteerBrowser,
  serveFile,
  getRequestParams,
  assertCreatePaymentSession,
} from './e2e-test-utils.js'
import KlarnaInitSessionFormPage from './pageObjects/KlarnaInitSessionFormPage.js'
import RedirectPaymentFormPage from './pageObjects/RedirectPaymentFormPage.js'
import KlarnaAuthenticationPage from './pageObjects/KlarnaAuthenticationPage.js'

const logger = httpUtils.getLogger()

// Flow description: https://docs.adyen.com/payment-methods/klarna/web-component#page-introduction
describe('::klarnaPayment::', () => {
  let browser
  let ctpClient
  const adyenMerchantAccount = config.getAllAdyenMerchantAccounts()[0]
  const ctpProjectKey = config.getAllCtpProjectKeys()[0]

  beforeEach(async () => {
    routes['/init-session-form'] = async (request, response) => {
      serveFile(
        './test/e2e/fixtures/klarna-init-session-form.html',
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
    routes['/return-url'] = async (request, response) => {
      const params = getRequestParams(request.url)
      return httpUtils.sendResponse({
        response,
        headers: {
          'Content-Type': 'text/html',
        },
        data:
          '<!DOCTYPE html><html><head></head>' +
          '<body><div id=redirect-response>' +
          `<div id=sessionId>${params.sessionId}</div><div id=redirectResult>${params.redirectResult}</div>` +
          '</div></body></html>',
      })
    }

    const ctpConfig = config.getCtpConfig(ctpProjectKey)
    ctpClient = await ctpClientBuilder.get(ctpConfig)
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
        // Step #1 - Create a payment session
        // https://docs.adyen.com/online-payments/web-components#create-payment-session
        let createSessionRequest = await getCreateSessionRequest(
          baseUrl,
          clientKey
        )
        createSessionRequest =
          buildKlarnaCreateSessionRequest(createSessionRequest)
        const paymentAfterCreateSession = await createPaymentSession(
          ctpClient,
          adyenMerchantAccount,
          ctpProjectKey,
          createSessionRequest
        )
        logger.debug(
          'klarna::paymentAfterCreateSession:',
          JSON.stringify(paymentAfterCreateSession)
        )

        // Step #2 - Setup Component
        // https://docs.adyen.com/online-payments/web-components#set-up
        await initPaymentSession({
          browserTab,
          baseUrl,
          clientKey,
          paymentAfterCreateSession,
        })

        const redirectPaymentResult = await handleRedirect({
          browserTab,
          baseUrl,
          clientKey,
        })
        logger.debug(
          'klarna::redirectPaymentResult:',
          JSON.stringify(redirectPaymentResult)
        )
        assertCreatePaymentSession(
          paymentAfterCreateSession,
          redirectPaymentResult
        )

        const notificationInteraction = await waitUntil(
          async () =>
            await fetchNotificationInterfaceInteraction(
              ctpClient,
              paymentAfterCreateSession.id
            )
        )



        console.log(notificationInteraction)
        // #3 - Capture the payment
        paymentAfterCapture = await capturePayment({
          payment: paymentAfterCreateSession,
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

  async function initPaymentSession({
    browserTab,
    baseUrl,
    clientKey,
    paymentAfterCreateSession,
  }) {
    const initPaymentSessionFormPage = new KlarnaInitSessionFormPage(
      browserTab,
      baseUrl
    )
    await initPaymentSessionFormPage.goToThisPage()

    return await initPaymentSessionFormPage.initPaymentSession({
      clientKey,
      paymentAfterCreateSession,
    })
  }

  async function handleRedirect({ browserTab, baseUrl, clientKey }) {
    await browserTab.waitForSelector('#buy-button:not([disabled])')
    const klarnaPage = new KlarnaAuthenticationPage(browserTab)

    const { sessionId, redirectResult } =
      await klarnaPage.doPaymentAuthentication()

    const redirectPaymentFormPage = new RedirectPaymentFormPage(
      browserTab,
      baseUrl
    )
    await redirectPaymentFormPage.goToThisPage()
    const submittedRedirectResult =
      await redirectPaymentFormPage.redirectToAdyenPaymentPage(
        clientKey,
        sessionId,
        redirectResult
      )

    return submittedRedirectResult
  }

  async function capturePayment({ payment }) {
    const { body: paymentAfterReceivingNotification } =
      await ctpClient.fetchById(ctpClient.builder.payments, payment.id)
    const transaction = paymentAfterReceivingNotification.transactions[0]

    const result = await ctpClient.update(
      ctpClient.builder.payments,
      payment.id,
      paymentAfterReceivingNotification.version,
      [
        createAddTransactionAction({
          type: 'Charge',
          state: 'Initial',
          currency: transaction.amount.currencyCode,
          amount: transaction.amount.centAmount,
        }),
      ]
    )

    return result.body
  }

  function assertManualCaptureResponse(paymentAfterCapture) {
    const interfaceInteraction = getLatestInterfaceInteraction(
      paymentAfterCapture.interfaceInteractions,
      constants.CTP_INTERACTION_TYPE_MANUAL_CAPTURE
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

  function buildKlarnaCreateSessionRequest(createSessionRequest) {
    const createSessionRequestJson = JSON.parse(createSessionRequest)
    createSessionRequestJson.countryCode = 'DE'
    createSessionRequestJson.shopperReference = 'YOUR TEST REFERENCE'
    createSessionRequestJson.telephoneNumber = '+4917614287462'
    createSessionRequestJson.billingAddress = {
      city: 'München',
      country: 'DE',
      houseNumberOrName: '44',
      postalCode: '80797',
      street: 'Adams-Lehmann-Straße',
    }
    createSessionRequestJson.lineItems = [
      {
        quantity: '1',
        amountExcludingTax: '331',
        taxPercentage: '2100',
        description: 'Shoes',
        id: 'Item #1',
        taxAmount: '69',
        amountIncludingTax: '400',
      },
      {
        quantity: '2',
        amountExcludingTax: '248',
        taxPercentage: '2100',
        description: 'Socks',
        id: 'Item #2',
        taxAmount: '52',
        amountIncludingTax: '300',
      },
    ]
    return JSON.stringify(createSessionRequestJson)
  }
})
