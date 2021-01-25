const iTSetUp = require('../integration/integration-test-set-up')
const ctpClientBuilder = require('../../src/ctp')
const { routes } = require('../../src/routes')
const configBuilder = require('../../src/config/config')
const httpUtils = require('../../src/utils')
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

    ctpClient = ctpClientBuilder.get()
    await iTSetUp.initServerAndExtension({
      ctpClient,
      routes,
      testServerPort: 8080,
    })
    browser = await initPuppeteerBrowser()
  })

  afterEach(async () => {
    await iTSetUp.stopRunningServers()
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
          const config = configBuilder.load()
          const baseUrl = config.apiExtensionBaseUrl
          const clientKey = config.adyen.clientKey
          const payment = await createPayment(ctpClient)

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

          const paymentAfterIdentifyShopper = await identifyShopper({
            payment: paymentAfterMakePayment,
            browserTab,
            baseUrl,
          })

          const paymentAfterAuthentication = await performChallengeFlow({
            payment: paymentAfterIdentifyShopper,
            browserTab,
            baseUrl,
          })

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

    const { body: updatedPayment } = await ctpClient.update(
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

    return updatedPayment
  }

  async function identifyShopper({ payment, browserTab, baseUrl }) {
    const {
      makePaymentResponse: makePaymentResponseString,
    } = payment.custom.fields
    const makePaymentResponse = await JSON.parse(makePaymentResponseString)
    const redirectPaymentFormPage = new RedirectPaymentFormPage(
      browserTab,
      baseUrl
    )
    await redirectPaymentFormPage.goToThisPage()
    await redirectPaymentFormPage.redirectToAdyenPaymentPage(
      makePaymentResponse
    )

    await browserTab.waitForTimeout(2000)

    const additionalPaymentDetailsInput = await browserTab.$(
      '#adyen-additional-payment-details'
    )
    const additionalPaymentDetailsString = await browserTab.evaluate(
      (el) => el.value,
      additionalPaymentDetailsInput
    )
    const { body: updatedPayment2 } = await ctpClient.update(
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

    return updatedPayment2
  }

  async function performChallengeFlow({ payment, browserTab, baseUrl }) {
    // Submit additional details 1
    const {
      submitAdditionalPaymentDetailsResponse: submitAdditionalPaymentDetailsResponseString,
    } = payment.custom.fields
    const submitAdditionalPaymentDetailsResponse1 = await JSON.parse(
      submitAdditionalPaymentDetailsResponseString
    )
    const redirectPaymentFormPage = new RedirectPaymentFormPage(
      browserTab,
      baseUrl
    )
    await redirectPaymentFormPage.goToThisPage()
    await redirectPaymentFormPage.redirectToAdyenPaymentPage(
      submitAdditionalPaymentDetailsResponse1
    )

    await browserTab.waitForTimeout(2000)

    // Submit additional details 2
    const creditCardNativePage = new CreditCardNativePage(browserTab, baseUrl)
    const additionalPaymentDetailsString2 = await creditCardNativePage.finish3dsNativePayment()
    const { body: finalPayment } = await ctpClient.update(
      ctpClient.builder.payments,
      payment.id,
      payment.version,
      [
        {
          action: 'setCustomField',
          name: 'submitAdditionalPaymentDetailsRequest',
          value: additionalPaymentDetailsString2,
        },
        {
          action: 'setCustomField',
          name: 'submitAdditionalPaymentDetailsResponse',
        },
      ]
    )

    return finalPayment
  }
})
