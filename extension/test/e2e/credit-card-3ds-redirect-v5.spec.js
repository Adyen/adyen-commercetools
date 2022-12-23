import ctpClientBuilder from '../../src/ctp.js'
import config from '../../src/config/config.js'
import { routes } from '../../src/routes.js'
import httpUtils from '../../src/utils.js'
import {
  assertPayment,
  createSession,
  setupComponent,
  initPuppeteerBrowser,
  serveFile,
} from './e2e-test-utils.js'
import RedirectPaymentFormPage from './pageObjects/RedirectPaymentFormPage.js'
import CreditCardRedirectPage from './pageObjects/CreditCard3dsRedirectPage.js'
import CreateSessionFormPage from './pageObjects/CreditCardCreateSessionFormPage.js'
import { getCreateSessionRequest, getRequestParams } from './e2e-test-utils'
const logger = httpUtils.getLogger()

function setRoute() {
  routes['/create-session-form'] = async (request, response) => {
    serveFile(
      './test/e2e/fixtures/credit-card-create-session-form.html',
      request,
      response
    )
  }
  routes['/redirect-payment-form'] = async (request, response) => {
    serveFile(
      './test/e2e/fixtures/redirect-payment-form-v5.html',
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
        `<body><div id=redirect-response>${params.redirectResult}</div></body></html>`,
    })
  }
}

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
    setRoute()

    const ctpConfig = config.getCtpConfig(ctpProjectKey)
    ctpClient = await ctpClientBuilder.get(ctpConfig)
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

            // Step #1 - Create a payment session
            // https://docs.adyen.com/online-payments/web-components#create-payment-session
            const paymentAfterCreateSession = await createSession(clientKey)
            logger.debug(
              'credit-card::paymentAfterMakePayment:',
              JSON.stringify(paymentAfterCreateSession)
            )

            // Step #2 - Setup Component
            // https://docs.adyen.com/online-payments/web-components#set-up
            const setupComponentResult = await setupComponent({
              browserTab,
              baseUrl,
              clientKey,
              paymentAfterCreateSession,
            })

            // Step #3 - Handle Redirect
            // https://docs.adyen.com/online-payments/web-components#handle-redirect-result
            paymentAfterRedirect = await handleRedirect({
              browserTab,
              baseUrl,
              payment: paymentAfterCreateSession,
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

  async function createSession(clientKey) {
    const createSessionRequest = await getCreateSessionRequest(clientKey)
    let payment = null
    const startTime = new Date().getTime()
    try {
      // TODO : Enable createPaymentSession function once it is avaialble in extension module
      // payment = await createPaymentSession(
      //   ctpClient,
      //   adyenMerchantAccount,
      //   ctpProjectKey,
      //   createSessionRequest
      // )
    } finally {
      const endTime = new Date().getTime()
      logger.debug('credit-card::createSession:', endTime - startTime)
    }

    // TODO : Dummy create session response obtained by running CURL command in bash.
    //        Remove the dummy response below once it is avaialble in extension module.
    payment = JSON.parse(
      '{"amount":{"currency":"EUR","value":1000},"expiresAt":"2022-12-23T13:24:14+01:00","id":"CS3DFE06619E8F50DB","merchantAccount":"CommercetoolsGmbHDE775","reference":"123","returnUrl":"https://your-company.com/checkout?shopperOrder=12xy..","sessionData":"Ab02b4c0!BQABAgCtnn7IuEvI9iTWn4i7lUTx5k38uajIUtqaFDxLTj4J1FeRr4iOm3/4BemGiQIHxR8ild82mHy4LBh3zC+V0+CEhw6DiNvdt/qBjUFJbINLWYfA7tm59HJB1hWI9naFpMJzGeHwXOeuoJwMODRMKOl0Py1Wnu7k6ZgE5F6z9w9oU4wREsEE68bmMFMrTJGy5x6S7pATfPtz3I/L16ls42BxQCyM0NM+Rfu2rQ6zOrBvXUpR+gfmgezpskZWQcIqY9dHTnOuG3srpcfwOtc6/xG6bEAHOe6GB53GmKqhEx7HV45HoJyEC31ifhSWsVwS8zHO6+dvbjBUsH2VJnfatSJyFS6GT37j090DPwri8DKz1OyQkHISVYq3cbcUbHP74kpHPDcE6PkMvQY1rNO+P2UpLSvuJ5Y1N6cjwuPu7jADC0KUqyGWj1RI6vw6fKNyEEDwvUolX2UPRmB1s7uT4gByMyj9yFrOpBwQBMTo1z8ZkpJaWb24OaqPsCnREkLNyfwguhPv751tPB19iQgwbW5JJEZs9UvTWBfBt0MHRAworXG6UyBHjjc2Q+QaD5GNijqQ5X/AYzuERIoHyTxEHZ9P+/q0bQwOWeRSjj1bNH42Q5VYxxkwToLMRUDvYfcl94KBByBbDf6ltXnV0iwybuvc1lYEuwJJdGEJWOkhucRYbhDmuch6BoVEOsLNwokxEWWIAEp7ImtleSI6IkFGMEFBQTEwM0NBNTM3RUFFRDg3QzI0REQ1MzkwOUI4MEE3OEE5MjNFMzgyM0Q2OERBQ0M5NEI5RkY4MzA1REMifbdSGVyFAqh0VtSGCb8665WQDL5SO64CKWln3OieaYcGkEdFyeTPXz0OzFZqSeTn8cEVZkqpcslZ6BuUV0MD9PEGd6tp71jrS0Z5yPuVw8DhE1EGaM73yQBqNXDCT6iMsz/hnrbDRh5v6+freqPatUYTy++IxQoHF0CDMTaJOeQiVrb0ReRJpQl/W9iSvODpkRJPVuxN5EiknVqItIZRGuhVNweBKPm705ls0frFA8HprjVU7DM9cPKOpSUUfVCpm8qROF5El/tyZ1AWCG9ydWbsi8fzkF6xxeMNhQyKMj2XgE7N97fu9imh2GrWqH3QvYCDdqKr1cQKDmN/SFcK592/8qD8rQuu4NwFgRs2MK+ghfRBdcBKHqS7iPOmYFJk51+AaXyQlgARy38gdI1MgMDEPo858Wl+vIvv7U9uliyi8+KS6X22gYtX0fGZ1LJ0FekGZtnCHDExYzSlpWJUHieIJZAIH7CvxMPh+JhGAyTdYqU="}'
    )
    return payment
  }

  async function setupComponent({
    browserTab,
    baseUrl,
    clientKey,
    paymentAfterCreateSession,
  }) {
    const createSessionFormPage = new CreateSessionFormPage(browserTab, baseUrl)
    await createSessionFormPage.goToThisPage()
    return await createSessionFormPage.setupComponent({
      clientKey,
      paymentAfterCreateSession,
    })
  }

  async function handleRedirect({ browserTab, baseUrl, payment }) {
    let result = null
    const startTime = new Date().getTime()
    try {
      // TODO : No need to submit additional payment details. Redirect should be done in front-end component above.

      const { createSessionResponse: createSessionResponseString } =
        payment.custom.fields
      const createSessionResponse = await JSON.parse(
        createSessionResponseString
      )

      const redirectPaymentFormPage = new RedirectPaymentFormPage(
        browserTab,
        baseUrl
      )
      await redirectPaymentFormPage.goToThisPage()

      await Promise.all([
        redirectPaymentFormPage.redirectToAdyenPaymentPage(
          createSessionResponse
        ),
        browserTab.waitForNavigation(),
      ])

      const creditCardRedirectPage = new CreditCardRedirectPage(browserTab)
      const result = await creditCardRedirectPage.finish3dsRedirectPayment()
    } finally {
      const endTime = new Date().getTime()
      logger.debug(
        'credit-card-3ds-redirect::handleRedirect:',
        endTime - startTime
      )
    }
    return result
  }
})
