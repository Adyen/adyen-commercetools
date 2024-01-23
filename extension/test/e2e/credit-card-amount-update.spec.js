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
describe('::creditCardPayment::amount-update::', () => {
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

  // eslint-disable-next-line no-template-curly-in-string
  it(`when payment session for credit card is created, initialized and authorized, the amount can be updated by 
     looking up corresponding payment with pspReference`, async () => {
    let paymentAfterCreateSession
    let initPaymentSessionResult

    let updatedAmountStatusCode
    let amountUpdatesResponse
    let amountUpdatesInterfaceInteractions
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
        'credit-card-amount-update::paymentAfterCreateSession:',
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

      const notificationInteraction = await waitUntil(
        async () =>
          await fetchNotificationInterfaceInteraction(
            ctpClient,
            paymentAfterCreateSession.id,
          ),
      )

      // Step #3 - Update Amount
      const { statusCode, updatedPayment } = await waitUntil(
        async () => {
          try {
            return await updateAmount(
              notificationInteraction,
              paymentAfterCreateSession,
            )
          } catch (err) {
            logger.error(
              'credit-card-amount-update::errors:',
              JSON.stringify(err),
            )
            return Promise.resolve()
          }
        },
        10,
        1_000,
      )

      amountUpdatesResponse = JSON.parse(
        updatedPayment.custom.fields.amountUpdatesResponse,
      )
      amountUpdatesInterfaceInteractions =
        updatedPayment.interfaceInteractions.filter(
          (ii) => ii.fields.type === 'amountUpdates',
        )
      updatedAmountStatusCode = statusCode
    } catch (err) {
      logger.error('credit-card-amount-update::errors:', JSON.stringify(err))
    }

    const notificationInteractionForAmountUpdates = await waitUntil(
      async () =>
        await fetchNotificationInterfaceInteraction(
          ctpClient,
          paymentAfterCreateSession.id,
          'authorisation_adjustment',
        ),
    )

    logger.debug(JSON.stringify(notificationInteractionForAmountUpdates))

    assertCreatePaymentSession(
      paymentAfterCreateSession,
      initPaymentSessionResult,
    )
    expect(updatedAmountStatusCode).to.equal(200)
    expect(amountUpdatesResponse.status).to.equal(
      'received',
      amountUpdatesResponse.body,
    )
    expect(amountUpdatesInterfaceInteractions).to.have.lengthOf(1)

    // assert notification response from amount updates
    const notificationStr =
      notificationInteractionForAmountUpdates.fields.notification
    const notificationJson = JSON.parse(notificationStr)
    expect(notificationJson.NotificationRequestItem.eventCode).to.equal(
      'AUTHORISATION_ADJUSTMENT',
    )
    expect(notificationJson.NotificationRequestItem.success).to.equal('true')
  })

  async function updateAmount(
    notificationInteraction,
    paymentAfterCreateSession,
  ) {
    const notificationStr = notificationInteraction.fields.notification
    const notificationJson = JSON.parse(notificationStr)
    const paymentPspReference =
      notificationJson.NotificationRequestItem.pspReference
    const amountUpdatesRequestDraft = {
      paymentPspReference,
      amount: {
        currency: 'EUR',
        value: 1010,
      },
      reason: 'delayedCharge',
      reference: paymentAfterCreateSession.key,
    }
    const { body: paymentAfterReceivingNotification } =
      await ctpClient.fetchById(
        ctpClient.builder.payments,
        paymentAfterCreateSession.id,
      )
    const { statusCode, body: updatedPayment } = await ctpClient.update(
      ctpClient.builder.payments,
      paymentAfterCreateSession.id,
      paymentAfterReceivingNotification.version,
      [
        {
          action: 'setCustomField',
          name: 'amountUpdatesRequest',
          value: JSON.stringify(amountUpdatesRequestDraft),
        },
      ],
    )
    return { statusCode, updatedPayment }
  }
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
