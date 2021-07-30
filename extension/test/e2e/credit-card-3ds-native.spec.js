const ctpClientBuilder = require('../../src/ctp')
const { routes } = require('../../src/routes')
const config = require('../../src/config/config')
const httpUtils = require('../../src/utils')

const logger = httpUtils.getLogger()
const {
  assertPayment,
  createPayment,
  initPuppeteerBrowser,
  serveFile,
} = require('./e2e-test-utils')
const MakePaymentFormPage = require('./pageObjects/CreditCardMakePaymentFormPage')
const RedirectPaymentFormPage = require('./pageObjects/RedirectPaymentFormPage')
const CreditCardNativePage = require('./pageObjects/CreditCard3dsNativePage')

// Flow description: https://docs.adyen.com/checkout/3d-secure/native-3ds2/web-component
describe('::creditCardPayment3dsNative::', () => {
  let browser
  let ctpClient
  const adyenMerchantAccount = config.getAllAdyenMerchantAccounts()[0]
  const ctpProjectKey = config.getAllCtpProjectKeys()[0]

  // See more: https://docs.adyen.com/development-resources/test-cards/test-card-numbers
  const creditCards = [
    {
      name: 'Mastercard',
      creditCardNumber: '5454 5454 5454 5454',
    },
    {
      name: 'Visa',
      creditCardNumber: '4917 6100 0000 0000',
    },
  ]

  beforeEach(async () => {
    routes['/make-payment-form'] = async (request, response) => {
      serveFile(
        './test/e2e/fixtures/3ds-v2-make-payment-form.html',
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
    ctpClient = ctpClientBuilder.get(ctpConfig)
    browser = await initPuppeteerBrowser()
  })

  afterEach(async () => {
    await browser.close()
  })

  creditCards.forEach(
    ({
      name,
      creditCardNumber,
      creditCardDate = '03/30',
      creditCardCvc = '737',
    }) => {
      // eslint-disable-next-line no-template-curly-in-string
      it(
        `when credit card issuer is ${name} and credit card number is ${creditCardNumber}, ` +
          'then it should successfully finish the payment with 3DS native authentication flow',
        async () => {
          const baseUrl = config.getModuleConfig().apiExtensionBaseUrl
          const clientKey =
            config.getAdyenConfig(adyenMerchantAccount).clientKey
          let paymentAfterAuthentication
          try {
            const payment = await createPayment(
              ctpClient,
              adyenMerchantAccount,
              ctpProjectKey
            )
            logger.debug(
              'credit-card-3ds-native::payment:',
              JSON.stringify(payment)
            )
            const browserTab = await browser.newPage()

            const paymentAfterMakePayment = await makePayment({
              browserTab,
              baseUrl,
              creditCardNumber,
              creditCardDate,
              creditCardCvc,
              payment,
              clientKey,
            })
            logger.debug(
              'credit-card-3ds-native::paymentAfterMakePayment:',
              JSON.stringify(paymentAfterMakePayment)
            )
            paymentAfterAuthentication = await performChallengeFlow({
              payment: paymentAfterMakePayment,
              browserTab,
              baseUrl,
            })
            logger.debug(
              'credit-card-3ds-native::paymentAfterAuthentication:',
              JSON.stringify(paymentAfterAuthentication)
            )
          } catch (err) {
            logger.error('credit-card-3ds-native::errors', JSON.stringify(err))
          }
          assertPayment(paymentAfterAuthentication)
        }
      )
    }
  )

  async function makePayment({
    browserTab,
    baseUrl,
    creditCardNumber,
    creditCardDate,
    creditCardCvc,
    payment,
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
      logger.debug('credit-card-3ds-native::makePayment:', endTime - startTime)
    }
    return result.body
  }

  async function performChallengeFlow({ payment, browserTab, baseUrl }) {
    // Submit additional details 1
    const { makePaymentResponse: makePaymentResponseString } =
      payment.custom.fields
    const makePaymentResponse = await JSON.parse(makePaymentResponseString)
    const redirectPaymentFormPage = new RedirectPaymentFormPage(
      browserTab,
      baseUrl
    )
    await redirectPaymentFormPage.goToThisPage()
    await redirectPaymentFormPage.redirectToAdyenPaymentPage(
      makePaymentResponse
    )

    await browserTab.waitForTimeout(15_000)

    // Submit additional details
    const creditCardNativePage = new CreditCardNativePage(browserTab, baseUrl)
    const additionalPaymentDetailsString =
      await creditCardNativePage.finish3dsNativePayment()
    logger.debug(
      'getMakePaymentAction',
      await creditCardNativePage.getMakePaymentAction()
    )
    logger.debug(
      'additionalPaymentDetailsString',
      additionalPaymentDetailsString
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
        ]
      )
    } catch (err) {
      logger.error(
        'credit-card-3ds-native::performChallengeFlow::errors:',
        JSON.stringify(err)
      )
      throw err
    } finally {
      const endTime = new Date().getTime()
      logger.debug(
        'credit-card-3ds-native::performChallengeFlow:',
        endTime - startTime
      )
    }
    return result.body
  }
})
