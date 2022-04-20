import ctpClientBuilder from '../../src/ctp.js'
import config from '../../src/config/config.cjs'
import { routes } from '../../src/routes.js'
import httpUtils from '../../src/utils.js'
import testUtils from './e2e-test-utils.js'
import MakePaymentFormPage from './pageObjects/CreditCardMakePaymentFormPage.js'
import RedirectPaymentFormPage from './pageObjects/RedirectPaymentFormPage.js'
import CreditCardRedirectPage from './pageObjects/CreditCard3dsRedirectPage.js'

const logger = httpUtils.getLogger()

const { assertPayment, createPayment, initPuppeteerBrowser, serveFile } =
  testUtils

// Flow description: https://docs.adyen.com/checkout/3d-secure/redirect-3ds2-3ds1/web-component
describe('::creditCardPayment3dsRedirect::', () => {
  let browser
  let ctpClient
  const adyenMerchantAccount = config.getAllAdyenMerchantAccounts()[0]
  const ctpProjectKey = config.getAllCtpProjectKeys()[0]

  // See more: https://docs.adyen.com/development-resources/test-cards/test-card-numbers
  const creditCards = [
    {
      name: 'Mastercard',
      creditCardNumber: '5212 3456 7890 1234',
    },
    {
      name: 'Visa',
      creditCardNumber: '4212 3456 7890 1237',
    },
  ]

  beforeEach(async () => {
    routes['/make-payment-form'] = async (request, response) => {
      serveFile('./test/e2e/fixtures/make-payment-form.html', request, response)
    }
    routes['/redirect-payment-form'] = async (request, response) => {
      serveFile(
        './test/e2e/fixtures/redirect-payment-form.html',
        request,
        response
      )
    }
    routes['/return-url'] = async (request, response) => {
      const params = getRequestParams(request)
      return httpUtils.sendResponse({
        response,
        headers: {
          'Content-Type': 'text/html',
        },
        data:
          '<!DOCTYPE html><html><head></head>' +
          `<body><div id=redirect-response>${params.redirectResult}</div></body></html>`,
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
          'then it should successfully finish the payment with 3DS redirect flow',
        async () => {
          let paymentAfterRedirect
          try {
            const baseUrl = config.getModuleConfig().apiExtensionBaseUrl
            const clientKey =
              config.getAdyenConfig(adyenMerchantAccount).clientKey

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
              'credit-card-3ds-redirect::paymentAfterMakePayment:',
              JSON.stringify(paymentAfterMakePayment)
            )
            paymentAfterRedirect = await handleRedirect({
              browserTab,
              baseUrl,
              payment: paymentAfterMakePayment,
            })
            logger.debug(
              'credit-card-3ds-redirect::paymentAfterRedirect:',
              JSON.stringify(paymentAfterRedirect)
            )
          } catch (err) {
            logger.error(
              'credit-card-3ds-redirect::errors',
              JSON.stringify(err)
            )
          }
          assertPayment(paymentAfterRedirect)
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
        makePaymentRequest
      )
    } finally {
      const endTime = new Date().getTime()
      logger.debug(
        'credit-card-3ds-redirect::makePayment:',
        endTime - startTime
      )
    }
    return payment
  }

  async function handleRedirect({ browserTab, baseUrl, payment }) {
    const { makePaymentResponse: makePaymentResponseString } =
      payment.custom.fields
    const makePaymentResponse = await JSON.parse(makePaymentResponseString)

    const redirectPaymentFormPage = new RedirectPaymentFormPage(
      browserTab,
      baseUrl
    )
    await redirectPaymentFormPage.goToThisPage()

    await Promise.all([
      redirectPaymentFormPage.redirectToAdyenPaymentPage(makePaymentResponse),
      browserTab.waitForNavigation(),
    ])

    const creditCardRedirectPage = new CreditCardRedirectPage(browserTab)
    const value = await creditCardRedirectPage.finish3dsRedirectPayment()

    // Submit payment details
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
              details: {
                redirectResult: decodeURIComponent(value),
              },
            }),
          },
        ]
      )
    } finally {
      const endTime = new Date().getTime()
      logger.debug(
        'credit-card-3ds-redirect::handleRedirect:',
        endTime - startTime
      )
    }
    return result.body
  }

  function getRequestParams(req) {
    const queries = req.url.split('?')
    const result = {}
    if (queries.length >= 2) {
      queries[1].split('&').forEach((item) => {
        try {
          result[item.split('=')[0]] = item.split('=')[1]
        } catch (e) {
          result[item.split('=')[0]] = ''
        }
      })
    }
    return result
  }
})
