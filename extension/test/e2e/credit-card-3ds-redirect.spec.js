const puppeteer = require('puppeteer')
const nodeStatic = require('node-static')
const querystring = require('querystring')
const iTSetUp = require('../integration/integration-test-set-up')
const ctpClientBuilder = require('../../src/ctp/ctp-client')
const { routes } = require('../../src/routes')
const httpUtils = require('../../src/utils')
const { assertPayment, createPaymentWithOriginKeyResponse } = require('./e2e-test-utils')
const MakePaymentFormPage = require('./pageObjects/CreditCardMakePaymentFormPage')
const RedirectPaymentFormPage = require('./pageObjects/RedirectPaymentFormPage')
const CreditCardRedirectPage = require('./pageObjects/CreditCard3dsRedirectPage')

// Flow description: https://docs.adyen.com/checkout/3d-secure/redirect-3ds2-3ds1/web-component
describe('::creditCardPayment3dsRedirect::', () => {
  let browser
  let ctpClient

  // See more: https://docs.adyen.com/development-resources/test-cards/test-card-numbers
  const creditCards = [
    {
      name: 'Mastercard',
      creditCardNumber: '5212 3456 7890 1234'
    },
    {
      name: 'Visa',
      creditCardNumber: '4212 3456 7890 1237'
    }
  ]

  beforeEach(async () => {
    const fileServer = new nodeStatic.Server()
    routes['/make-payment-form'] = async (request, response) => {
      fileServer.serveFile('./test/e2e/fixtures/make-payment-form.html', 200, {}, request, response)
    }
    routes['/redirect-payment-form'] = async (request, response) => {
      fileServer.serveFile('./test/e2e/fixtures/redirect-payment-form.html', 200, {}, request, response)
    }
    routes['/return-url'] = async (request, response) => {
      const body = await httpUtils.collectRequestData(request)
      return httpUtils.sendResponse({
        response,
        headers: {
          'Content-Type': 'text/html'
        },
        data: '<!DOCTYPE html><html><head></head>'
          + `<body><div id=redirect-response>${body[0].toString()}</div></body></html>`
      })
    }

    ctpClient = ctpClientBuilder.get()
    await iTSetUp.initServerAndExtension({ ctpClient, routes, testServerPort: 8080 })
    browser = await puppeteer.launch({
      headless: true,
      ignoreHTTPSErrors: true,
      args: ['--disable-web-security', '--disable-features=IsolateOrigins,site-per-process']
    })
  })

  afterEach(async () => {
    await iTSetUp.stopRunningServers()
    await browser.close()
  })

  creditCards.forEach(({
                         name, creditCardNumber
                       }) => {
    // eslint-disable-next-line no-template-curly-in-string
    it(`when credit card issuer is ${name} and number is ${creditCardNumber}, ` +
      'then it should successfully handle the 3D Secure 1 type authentication through a redirect',
      async () => {
        const page = await browser.newPage()

        // next steps depend on whether the /payments response contains an action object in card.
        // here in this step we will receive `action.type: redirect`.
        const payment = await makePaymentRequest(page, creditCardNumber);

        // an example "body" representation of the redirected http call to "return-url".
        // "details":{
        //     "MD":"Ab02b4c0!BQABAgCW5sxB4e/==..",
        //     "PaRes":"eNrNV0mTo7gS.."
        // }
        const details = await handleTheRedirect(page, payment);

        const { body: authorisedPayment } = await ctpClient.update(ctpClient.builder.payments, payment.id,
          payment.version, [{
            action: 'setCustomField',
            name: 'submitAdditionalPaymentDetailsRequest',
            value: JSON.stringify({
              details
            })
          }])

        assertPayment(authorisedPayment)
      })
  })

  async function makePaymentRequest(page, creditCardNumber) {
    const initialPayment = await createPaymentWithOriginKeyResponse(ctpClient)

    const form = new MakePaymentFormPage(page)
    await form.goToThisPage()
    const makePaymentRequest =  await form.getMakePaymentRequest({
      getOriginKeysResponse: JSON.parse(initialPayment.custom.fields.getOriginKeysResponse),
      creditCardNumber,
      creditCardDate: '10/20',
      creditCardCvc: '737'
    })

    const {body: payment} = await ctpClient.update(ctpClient.builder.payments, initialPayment.id,
      initialPayment.version, [{
        action: 'setCustomField',
        name: 'makePaymentRequest',
        value: makePaymentRequest
      }])

    return payment
  }

  async function handleTheRedirect(page, payment) {
    const redirectPaymentFormPage = new RedirectPaymentFormPage(page)
    await redirectPaymentFormPage.goToThisPage()

    await Promise.all([
      redirectPaymentFormPage.redirectToAdyenPaymentPage(
        JSON.parse(payment.custom.fields.getOriginKeysResponse),
        JSON.parse(payment.custom.fields.makePaymentResponse)),
      page.waitForNavigation()
    ])

    const creditCardRedirectPage = new CreditCardRedirectPage(page)
    // for example:
    // MD=Ab02b4c0%21BQABAgCW5sxB4e%2F%3D%3D..&PaRes=eNrNV0mTo7gS..
    const variables = await creditCardRedirectPage.finish3dsRedirectPayment()
    return querystring.parse(variables)
  }
})
