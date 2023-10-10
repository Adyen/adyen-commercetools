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

const logger = httpUtils.getLogger()

function setRoute() {
  routes['/init-session-form'] = async (request, response) => {
    serveFile(
      './test/e2e/fixtures/credit-card-init-session-form.html',
      request,
      response,
    )
  }
}
// Flow description: https://docs.adyen.com/checkout/components-web
describe('::creditCardPayment::cancel-payment::', () => {
  let browser
  let ctpClient
  const ctpProjectKey = config.getAllCtpProjectKeys()[0]
  const adyenMerchantAccount = config.getAllAdyenMerchantAccounts()[0]

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

  it(`when payment session for credit card is created, initialized and ' + 
      'authorized("authorization success transaction") ' +
      'and when a "CancelAuthorization initial transaction" is added ' +
      'then Adyen should respond with [cancel-received] for each transaction ' +
      'and payment should have "CancelAuthorization success transaction" and notification`, async () => {
    let paymentAfterCreateSession
    let initPaymentSessionResult

    let cancelledPaymentStatusCode
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
        'credit-card-cancel-payment::paymentAfterCreateSession:',
        JSON.stringify(paymentAfterCreateSession),
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
            paymentAfterCreateSession.id,
          ),
      )

      // Step #3 - Cancel payment
      const { statusCode, body: cancelledPayment } = await waitUntil(
        async () => {
          try {
            const { body: paymentAfterReceivingNotification } =
              await ctpClient.fetchById(
                ctpClient.builder.payments,
                paymentAfterCreateSession.id,
              )

            return await ctpClient.update(
              ctpClient.builder.payments,
              paymentAfterReceivingNotification.id,
              paymentAfterReceivingNotification.version,
              [
                createAddTransactionAction({
                  type: 'CancelAuthorization',
                  state: 'Initial',
                  currency: 'EUR',
                  amount: 500,
                }),
              ],
            )
          } catch (err) {
            logger.error(
              'credit-card-cancel-payment::errors:',
              JSON.stringify(err),
            )
            return Promise.resolve()
          }
        },
        10,
        1_000,
      )

      cancelledPaymentStatusCode = statusCode

      logger.debug(JSON.stringify(cancelledPayment))
    } catch (err) {
      logger.error('credit-card-cancel-payment::errors:', JSON.stringify(err))
    }

    const notificationInteractionForCancelPayment = await waitUntil(
      async () =>
        await fetchNotificationInterfaceInteraction(
          ctpClient,
          paymentAfterCreateSession.id,
          `cancellation`,
        ),
    )

    const { body: paymentAfterReceivingNotification } =
      await ctpClient.fetchById(
        ctpClient.builder.payments,
        paymentAfterCreateSession.id,
      )

    assertCreatePaymentSession(
      paymentAfterCreateSession,
      initPaymentSessionResult,
    )

    expect(cancelledPaymentStatusCode).to.be.equal(200)

    expect(paymentAfterReceivingNotification.transactions).to.have.length.gte(2)
    const transaction = paymentAfterReceivingNotification.transactions[1]
    expect(transaction.type).to.equal('CancelAuthorization')
    expect(transaction.state).to.equal('Success')

    // assert notification response from cancel payment
    const notificationStr =
      notificationInteractionForCancelPayment.fields.notification
    const notificationJson = JSON.parse(notificationStr)
    expect(notificationJson.NotificationRequestItem.eventCode).to.equal(
      'CANCELLATION',
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
        createSessionRequest,
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
      baseUrl,
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
})
