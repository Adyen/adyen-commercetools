import { expect } from 'chai'
import ctpClientBuilder from '../../src/ctp.js'
import { routes } from '../../src/routes.js'
import config from '../../src/config/config.js'
import CreditCardInitSessionFormPage from './pageObjects/CreditCardInitSessionFormPage.js'
import httpUtils from '../../src/utils.js'
import {
  waitUntil,
  fetchNotificationInterfaceInteraction,
} from '../test-utils.js'

import {
  assertCreatePaymentSession,
  createPaymentSession,
  initPuppeteerBrowser,
  serveFile,
  getCreateSessionRequest,
} from './e2e-test-utils.js'
import { createAddTransactionAction } from '../../src/paymentHandler/payment-utils.js'
import crypto from 'crypto'

const logger = httpUtils.getLogger()

function setRoute() {
  routes['/init-session-form'] = async (request, response) => {
    serveFile(
      './test/e2e/fixtures/credit-card-init-session-form.html',
      request,
      response
    )
  }
}
// Flow description: https://docs.adyen.com/checkout/components-web
describe('::creditCardPayment::refund-payment::', () => {
  let browser
  let ctpClient
  const ctpProjectKey = config.getAllCtpProjectKeys()[0]
  const adyenMerchantAccount = config.getAllAdyenMerchantAccounts()[0]
  const idempotencyKey1 = crypto.randomBytes(20).toString('hex')
  const idempotencyKey2 = crypto.randomBytes(20).toString('hex')

  // See more: https://docs.adyen.com/development-resources/test-cards/test-card-number

  beforeEach(async () => {
    setRoute()
    const ctpConfig = config.getCtpConfig(ctpProjectKey)
    ctpClient = await ctpClientBuilder.get(ctpConfig)
    browser = await initPuppeteerBrowser()
  })

  afterEach(async () => {
    await browser.close()
  })

  it(`given a payment with "authorization success transaction" ' +
      'when multiple "refund initial transactions" are added ' +
      'then Adyen should response with [refund-received] for each transaction ' +
      'and payment should have "refund success transactions" and notification`, async () => {
    let paymentAfterCreateSession
    let initPaymentSessionResult

    let refundPaymentStatusCode
    const creditCardNumber = '5101 1800 0000 0007'
    const creditCardDate = '03/30'
    const creditCardCvc = '737'

    try {
      const baseUrl = config.getModuleConfig().apiExtensionBaseUrl
      const clientKey = config.getAdyenConfig(adyenMerchantAccount).clientKey
      const browserTab = await browser.newPage()

      // Step #1 - Create a payment session
      // https://docs.adyen.com/online-payments/web-components#create-payment-session
      paymentAfterCreateSession = await createSession(clientKey)
      logger.debug(
        'credit-card-refund-payment::paymentAfterCreateSession:',
        JSON.stringify(paymentAfterCreateSession)
      )

      // Step #2 - Setup Component
      // https://docs.adyen.com/online-payments/web-components#set-up

      initPaymentSessionResult = await initPaymentSession({
        browserTab,
        baseUrl,
        clientKey,
        paymentAfterCreateSession,
        creditCardNumber,
        creditCardDate,
        creditCardCvc,
      })

      await waitUntil(
        async () =>
          await fetchNotificationInterfaceInteraction(
            ctpClient,
            paymentAfterCreateSession.id
          )
      )

      // Step #3 - Refund payment

      const { body: paymentAfterReceivingNotification } =
        await ctpClient.fetchById(
          ctpClient.builder.payments,
          paymentAfterCreateSession.id
        )

      const { statusCode, paymentAfterRefundRequest } =
        await refundPaymentTransactions(paymentAfterReceivingNotification)

      refundPaymentStatusCode = statusCode

      logger.debug(JSON.stringify(paymentAfterRefundRequest))
    } catch (err) {
      logger.error('credit-card-refund-payment::errors:', JSON.stringify(err))
    }

    const notificationInteractionForRefundPayment = await waitUntil(
      async () =>
        await fetchNotificationInterfaceInteraction(
          ctpClient,
          paymentAfterCreateSession.id,
          `REFUND`
        )
    )

    const { body: paymentAfterReceivingRefundNotification } =
      await ctpClient.fetchById(
        ctpClient.builder.payments,
        paymentAfterCreateSession.id
      )

    assertCreatePaymentSession(
      paymentAfterCreateSession,
      initPaymentSessionResult
    )

    expect(refundPaymentStatusCode).to.be.equal(200)

    expect(
      paymentAfterReceivingRefundNotification.transactions
    ).to.have.lengthOf(4)
    const refundTransactions = [
      paymentAfterReceivingRefundNotification.transactions[1],
      paymentAfterReceivingRefundNotification.transactions[2],
      paymentAfterReceivingRefundNotification.transactions[3],
    ]
    for (const refundTransaction of refundTransactions) {
      expect(refundTransaction.type).to.equal('Refund')
      expect(refundTransaction.state).to.equal('Success')
    }

    // assert notification response from refund payment
    const notificationStr =
      notificationInteractionForRefundPayment.fields.notification
    const notificationJson = JSON.parse(notificationStr)
    expect(notificationJson.NotificationRequestItem.eventCode).to.equal(
      'REFUND'
    )
    expect(notificationJson.NotificationRequestItem.success).to.equal('true')
  })

  async function createSession(clientKey) {
    const createSessionRequest = await getCreateSessionRequest(clientKey)
    let payment = null
    const startTime = new Date().getTime()
    try {
      payment = await createPaymentSession(
        ctpClient,
        adyenMerchantAccount,
        ctpProjectKey,
        createSessionRequest
      )
    } catch (err) {
      logger.error('credit-card::createSession::errors', JSON.stringify(err))
    } finally {
      const endTime = new Date().getTime()
      logger.debug('credit-card::createSession:', endTime - startTime)
    }

    return payment
  }

  async function initPaymentSession({
    browserTab,
    baseUrl,
    clientKey,
    paymentAfterCreateSession,
    creditCardNumber,
    creditCardDate,
    creditCardCvc,
  }) {
    const initSessionFormPage = new CreditCardInitSessionFormPage(
      browserTab,
      baseUrl
    )
    await initSessionFormPage.goToThisPage()
    await initSessionFormPage.initPaymentSession({
      clientKey,
      paymentAfterCreateSession,
      creditCardNumber,
      creditCardDate,
      creditCardCvc,
    })
    return await initSessionFormPage.getPaymentAuthResult()
  }

  async function refundPaymentTransactions(paymentAfterCreateSession) {
    const { statusCode, body: refundPayment } = await ctpClient.update(
      ctpClient.builder.payments,
      paymentAfterCreateSession.id,
      paymentAfterCreateSession.version,
      [
        createAddTransactionAction({
          type: 'Refund',
          state: 'Initial',
          currency: 'EUR',
          amount: 500,
          custom: {
            type: {
              typeId: 'type',
              key: 'ctp-adyen-integration-transaction-payment-type',
            },
            fields: {
              idempotencyKey: idempotencyKey1,
            },
          },
        }),
        createAddTransactionAction({
          type: 'Refund',
          state: 'Initial',
          currency: 'EUR',
          amount: 300,
          custom: {
            type: {
              typeId: 'type',
              key: 'ctp-adyen-integration-transaction-payment-type',
            },
            fields: {
              idempotencyKey: idempotencyKey2,
            },
          },
        }),
        createAddTransactionAction({
          type: 'Refund',
          state: 'Initial',
          currency: 'EUR',
          amount: 100,
        }),
      ]
    )
    return { statusCode, refundPayment }
  }
})
