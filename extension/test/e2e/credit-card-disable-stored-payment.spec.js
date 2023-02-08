import ctpClientBuilder from '../../src/ctp.js'
import { routes } from '../../src/routes.js'
import config from '../../src/config/config.js'
import CreditCardInitSessionFormPage from './pageObjects/CreditCardInitSessionFormPage.js'
import httpUtils from '../../src/utils.js'
import { waitUntil } from '../test-utils.js'

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
      response
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

  // eslint-disable-next-line no-template-curly-in-string
  it(`when payment session for credit card is created, initialized and authorized, the amount can be updated by 
     looking up corresponding payment with pspReference`, async () => {
    let paymentAfterCreateSession
    // let initPaymentSessionResult

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
        'credit-card-disable-stored-payment::paymentAfterCreateSession:',
        JSON.stringify(paymentAfterCreateSession)
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
      console.log('waitUntil')
      await waitUntil(
        async () =>
          await fetchNotificationInterfaceInteraction(
            paymentAfterCreateSession.id
          )
      )

      const notificationInteraction =
        await fetchNotificationInterfaceInteraction(
          paymentAfterCreateSession.id
        )

      // Step #3 - Disable stored payment
      console.log('notificationInteraction')
      console.log(notificationInteraction)
      const recurringDetailReference =
        notificationInteraction.recurringDetailReference

      await createDisablePaymentRequestPayment(
        'shopperReference',
        recurringDetailReference
      )
      // const { statusCode, updatedPayment } = await updateAmount(
      //   notificationInteraction,
      //   paymentAfterCreateSession
      // )
      // amountUpdatesResponse = JSON.parse(
      //   updatedPayment.custom.fields.amountUpdatesResponse
      // )
      // amountUpdatesInterfaceInteractions =
      //   updatedPayment.interfaceInteractions.filter(
      //     (ii) => ii.fields.type === 'amountUpdates'
      //   )
      // updatedAmountStatusCode = statusCode
    } catch (err) {
      logger.error('credit-card-amount-update::errors:', JSON.stringify(err))
    }

    // assertCreatePaymentSession(
    //   paymentAfterCreateSession,
    //   initPaymentSessionResult
    // )
    // expect(updatedAmountStatusCode).to.equal(200)
    // expect(amountUpdatesResponse.status).to.equal('received')
    // expect(amountUpdatesInterfaceInteractions).to.have.lengthOf(1)
  })

  async function createSession(clientKey) {
    let createSessionRequest = await getCreateSessionRequest(clientKey)
    const createSessionRequestJson = JSON.parse(createSessionRequest)
    createSessionRequestJson.storePaymentMethod = true
    createSessionRequestJson.shopperReference = 'shopperReference'
    createSessionRequestJson.shopperInteraction = 'Ecommerce'

    createSessionRequest = JSON.stringify(createSessionRequestJson)
    let payment = null
    console.log('createSessionRequest')
    console.log(createSessionRequest)
    payment = await createPaymentSession(
      ctpClient,
      adyenMerchantAccount,
      commercetoolsProjectKey,
      createSessionRequest
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

  async function fetchNotificationInterfaceInteraction(paymentId) {
    const { body } = await ctpClient.fetchById(
      ctpClient.builder.payments,
      paymentId
    )
    return body.interfaceInteractions.find(
      (interaction) => interaction.fields.type === 'notification'
    )
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
            disableStoredPaymentRequestDraft
          ),
          adyenMerchantAccount,
          commercetoolsProjectKey,
        },
      },
    }
    console.log('disabledStoredPaymentRequest')
    console.log(JSON.stringify(disableStoredPaymentRequestDraft))
    const { body: payment } = await ctpClient.create(
      ctpClient.builder.payments,
      paymentDraft
    )
    console.log('disbled-payment')
    console.log(payment)
    return payment
  }
})
