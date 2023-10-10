import ctpClientBuilder from '../../src/ctp.js'
import { routes } from '../../src/routes.js'
import config from '../../src/config/config.js'
import httpUtils from '../../src/utils.js'
import {
  assertPayment,
  createPayment,
  initPuppeteerBrowser,
  serveFile,
} from './e2e-test-utils.js'
import MakePaymentFormPage from './pageObjects/CreditCardMakePaymentFormPage.js'
import RedirectPaymentFormPage from './pageObjects/RedirectPaymentFormPageAdvancedFlow.js'
import CreditCardNativePage from './pageObjects/CreditCard3dsNativePage.js'

const logger = httpUtils.getLogger()

// Flow description: https://docs.adyen.com/checkout/3d-secure/native-3ds2/web-component
describe('::creditCardAdvancedFlow::', () => {
  let browser
  let ctpClient
  const adyenMerchantAccount = config.getAllAdyenMerchantAccounts()[0]
  const ctpProjectKey = config.getAllCtpProjectKeys()[0]

  beforeEach(async () => {
    routes['/make-payment-form'] = async (request, response) => {
      serveFile(
        './test/e2e/fixtures/3ds-v2-make-payment-form.html',
        request,
        response,
      )
    }
    routes['/redirect-payment-form'] = async (request, response) => {
      serveFile(
        './test/e2e/fixtures/redirect-payment-form-advanced-flow.html',
        request,
        response,
      )
    }
    routes['/return-url'] = async (request, response) => {
      const body = await httpUtils.collectRequestData(request)
      return httpUtils.sendResponse({
        response,
        headers: {
          'Content-Type': 'text/html',
        },
        data:
          '<!DOCTYPE html><html><head></head>' +
          `<body><div id=redirect-response>${body[0].toString()}</div></body></html>`,
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
    `when credit card issuer is Visa and credit card number is 4917 6100 0000 0000, ` +
      'then it should successfully finish the payment with advanced 3DS native authentication flow',
    async () => {
      // See more: https://docs.adyen.com/development-resources/test-cards/test-card-numbers
      const creditCardNumber = '4917 6100 0000 0000'
      const creditCardDate = '03/30'
      const creditCardCvc = '737'

      const baseUrl = config.getModuleConfig().apiExtensionBaseUrl
      const clientKey = config.getAdyenConfig(adyenMerchantAccount).clientKey
      let paymentAfterAuthentication
      try {
        const browserTab = await browser.newPage()
        const paymentAfterMakePayment = await makePayment({
          browserTab,
          baseUrl,
          creditCardNumber,
          creditCardDate,
          creditCardCvc,
          clientKey,
        })
        logger.debug(
          'creditCardAdvancedFlow::paymentAfterMakePayment:',
          JSON.stringify(paymentAfterMakePayment),
        )
        paymentAfterAuthentication = await performChallengeFlow({
          payment: paymentAfterMakePayment,
          browserTab,
          baseUrl,
          clientKey,
        })
        logger.debug(
          'creditCardAdvancedFlow::paymentAfterAuthentication:',
          JSON.stringify(paymentAfterAuthentication),
        )
      } catch (err) {
        logger.error('creditCardAdvancedFlow::errors', JSON.stringify(err))
      }
      assertPayment(paymentAfterAuthentication)
    },
  )

  async function makePayment({
    browserTab,
    baseUrl,
    creditCardNumber,
    creditCardDate,
    creditCardCvc,
    clientKey,
  }) {
    const makePaymentFormPage = new MakePaymentFormPage(browserTab, baseUrl)
    await makePaymentFormPage.goToThisPage()
    const makePaymentRequest = await makePaymentFormPage.getMakePaymentRequest({
      creditCardNumber,
      creditCardDate,
      creditCardCvc,
      clientKey,
    })
    let payment = null
    const startTime = new Date().getTime()
    try {
      payment = await createPayment(
        ctpClient,
        adyenMerchantAccount,
        ctpProjectKey,
        makePaymentRequest,
      )
    } finally {
      const endTime = new Date().getTime()
      logger.debug('creditCardAdvancedFlow::makePayment:', endTime - startTime)
    }
    return payment
  }

  async function performChallengeFlow({
    payment,
    browserTab,
    baseUrl,
    clientKey,
  }) {
    // Submit additional details 1
    const { makePaymentResponse: makePaymentResponseString } =
      payment.custom.fields
    const makePaymentResponse = await JSON.parse(makePaymentResponseString)
    const redirectPaymentFormPage = new RedirectPaymentFormPage(
      browserTab,
      baseUrl,
    )
    await redirectPaymentFormPage.goToThisPage()
    await redirectPaymentFormPage.redirectToAdyenPaymentPage(
      makePaymentResponse,
      clientKey,
    )

    await browserTab.waitForTimeout(5_000)

    // Submit additional details
    const creditCardNativePage = new CreditCardNativePage(browserTab, baseUrl)
    const additionalPaymentDetailsString =
      await creditCardNativePage.finish3dsNativePayment()

    logger.debug(
      'additionalPaymentDetailsString',
      additionalPaymentDetailsString,
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
            name: 'submitAdditionalPaymentDetailsRequest',
            value: additionalPaymentDetailsString,
          },
        ],
      )
    } catch (err) {
      logger.error(
        'creditCardAdvancedFlow::performChallengeFlow::errors:',
        JSON.stringify(err),
      )
      throw err
    } finally {
      const endTime = new Date().getTime()
      logger.debug(
        'creditCardAdvancedFlow::performChallengeFlow:',
        endTime - startTime,
      )
    }
    return result.body
  }
})
