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
  createPaymentSession,
  initPuppeteerBrowser,
  serveFile,
  getCreateSessionRequest,
} from './e2e-test-utils.js'
import constants from '../../src/config/constants.js'

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
describe('::creditCardPayment::disable-stored-payment::', () => {
  let browser
  let ctpClient
  const commercetoolsProjectKey = config.getAllCtpProjectKeys()[0]
  const adyenMerchantAccount = config.getAllAdyenMerchantAccounts()[0]

  // See more: https://docs.adyen.com/development-resources/test-cards/test-card-number

  beforeEach(async () => {
    setRoute()
    const ctpConfig = config.getCtpConfig(commercetoolsProjectKey)
    ctpClient = await ctpClientBuilder.get(ctpConfig)
    browser = await initPuppeteerBrowser()
  })

  afterEach(async () => {
    await browser.close()
  })

  it(`should disable stored one-off payment when correct request is sent`, async () => {
    let paymentAfterCreateSession
    let disabledPayment

    const creditCardNumber = '5101 1800 0000 0007'
    const creditCardDate = '03/30'
    const creditCardCvc = '737'

    try {
      const baseUrl = config.getModuleConfig().apiExtensionBaseUrl
      const clientKey = config.getAdyenConfig(adyenMerchantAccount).clientKey
      const browserTab = await browser.newPage()

      // Step #1 - Create a payment session
      // https://docs.adyen.com/online-payments/web-components#create-payment-session
      paymentAfterCreateSession = await creatSession(clientKey, 'CardOnFile')
      logger.debug(
        'credit-card-disable-stored-payment::paymentAfterCreateSession:',
        JSON.stringify(paymentAfterCreateSession),
      )

      // Step #2 - Setup Component
      // https://docs.adyen.com/online-payments/web-components#set-up

      await initPaymentSession({
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

      // Step #3 - Disable stored payment

      const notificationRequestItem = JSON.parse(
        notificationInteraction.fields.notification,
      ).NotificationRequestItem

      const recurringDetailReference =
        notificationRequestItem.recurringDetailReference

      disabledPayment = await createDisablePaymentRequestPayment({
        shopperReference: 'shopperReference',
        recurringDetailReference,
      })
    } catch (err) {
      logger.error(
        'credit-card-disable-stored-payment::errors:',
        JSON.stringify(err),
      )
    }

    expect(
      disabledPayment?.custom?.fields?.disableStoredPaymentResponse,
    ).to.be.equal('{"response":"[detail-successfully-disabled]"}')
  })

  it(`should disable stored subscription payment when correct request is sent`, async () => {
    let paymentAfterCreateSession
    let disabledPayment

    const creditCardNumber = '5101 1800 0000 0007'
    const creditCardDate = '03/30'
    const creditCardCvc = '737'

    try {
      const baseUrl = config.getModuleConfig().apiExtensionBaseUrl
      const clientKey = config.getAdyenConfig(adyenMerchantAccount).clientKey
      const browserTab = await browser.newPage()

      // Step #1 - Create a payment session
      // https://docs.adyen.com/online-payments/web-components#create-payment-session
      paymentAfterCreateSession = await creatSession(clientKey, 'Subscription')
      logger.debug(
        'credit-card-disable-stored-payment::paymentAfterCreateSession:',
        JSON.stringify(paymentAfterCreateSession),
      )

      // Step #2 - Setup Component
      // https://docs.adyen.com/online-payments/web-components#set-up

      await initPaymentSession({
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

      // Step #3 - Disable stored payment
      const notificationRequestItem = JSON.parse(
        notificationInteraction.fields.notification,
      ).NotificationRequestItem

      const recurringDetailReference =
        notificationRequestItem.recurringDetailReference

      disabledPayment = await createDisablePaymentRequestPayment({
        shopperReference: 'shopperReference',
        recurringDetailReference,
      })
    } catch (err) {
      logger.error(
        'credit-card-disable-stored-payment::errors:',
        JSON.stringify(err),
      )
    }

    expect(
      disabledPayment?.custom?.fields?.disableStoredPaymentResponse,
    ).to.be.equal('{"response":"[detail-successfully-disabled]"}')
  })

  it(`should disable automatic top-up payment when correct request is sent`, async () => {
    let paymentAfterCreateSession
    let disabledPayment

    const creditCardNumber = '5101 1800 0000 0007'
    const creditCardDate = '03/30'
    const creditCardCvc = '737'

    try {
      const baseUrl = config.getModuleConfig().apiExtensionBaseUrl
      const clientKey = config.getAdyenConfig(adyenMerchantAccount).clientKey
      const browserTab = await browser.newPage()

      // Step #1 - Create a payment session
      // https://docs.adyen.com/online-payments/web-components#create-payment-session
      paymentAfterCreateSession = await creatSession(
        clientKey,
        'UnscheduledCardOnFile',
      )
      logger.debug(
        'credit-card-disable-stored-payment::paymentAfterCreateSession:',
        JSON.stringify(paymentAfterCreateSession),
      )

      // Step #2 - Setup Component
      // https://docs.adyen.com/online-payments/web-components#set-up

      await initPaymentSession({
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

      // Step #3 - Disable stored payment
      const notificationRequestItem = JSON.parse(
        notificationInteraction.fields.notification,
      ).NotificationRequestItem

      const recurringDetailReference =
        notificationRequestItem.recurringDetailReference

      disabledPayment = await createDisablePaymentRequestPayment({
        shopperReference: 'shopperReference',
        recurringDetailReference,
      })
    } catch (err) {
      logger.error(
        'credit-card-disable-stored-payment::errors:',
        JSON.stringify(err),
      )
    }

    expect(
      disabledPayment?.custom?.fields?.disableStoredPaymentResponse,
    ).to.be.equal('{"response":"[detail-successfully-disabled]"}')
  })

  async function creatSession(clientKey, recurringProcessingModel) {
    let createSessionRequest = await getCreateSessionRequest(clientKey)
    const createSessionRequestJson = JSON.parse(createSessionRequest)
    createSessionRequestJson.storePaymentMethod = true
    createSessionRequestJson.shopperReference = 'shopperReference'
    createSessionRequestJson.shopperInteraction = 'Ecommerce'
    createSessionRequestJson.recurringProcessingModel = recurringProcessingModel
    createSessionRequest = JSON.stringify(createSessionRequestJson)
    let payment = null
    payment = await createPaymentSession(
      ctpClient,
      adyenMerchantAccount,
      commercetoolsProjectKey,
      createSessionRequest,
    )

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

  async function createDisablePaymentRequestPayment({
    shopperReference,
    recurringDetailReference,
  }) {
    const disableStoredPaymentRequestDraft = {
      shopperReference,
      recurringDetailReference,
    }

    const paymentDraft = {
      amountPlanned: {
        currencyCode: 'EUR',
        centAmount: 0,
      },
      paymentMethodInfo: {
        paymentInterface: constants.CTP_ADYEN_INTEGRATION,
      },
      custom: {
        type: {
          typeId: 'type',
          key: constants.CTP_PAYMENT_CUSTOM_TYPE_KEY,
        },
        fields: {
          disableStoredPaymentRequest: JSON.stringify(
            disableStoredPaymentRequestDraft,
          ),
          adyenMerchantAccount,
          commercetoolsProjectKey,
        },
      },
    }

    const { body: payment } = await ctpClient.create(
      ctpClient.builder.payments,
      paymentDraft,
    )

    return payment
  }
})
