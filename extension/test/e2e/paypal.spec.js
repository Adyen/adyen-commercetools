import config from "../../src/config/config.js";
import {routes} from "../../src/routes.js";
import {assertPayment, createPayment, initPuppeteerBrowser, serveFile} from "./e2e-test-utils.js";
import ctpClientBuilder from "../../src/ctp.js";
import MakePaymentFormPage from './pageObjects/PaypalMakePaymentFormPage.js'
import PaypalPopupPage from './pageObjects/PaypalPopupPage.js'
import httpUtils from "../../src/utils.js";

describe('::paypalPayment::', () => {
  let browser
  let ctpClient
  let payment
  let paypalMakePaymentFormPage
  const adyenMerchantAccount = config.getAllAdyenMerchantAccounts()[0]
  const ctpProjectKey = config.getAllCtpProjectKeys()[0]

  beforeEach(async () => {
    routes['/make-payment-form'] = async (request, response) => {
      serveFile('./test/e2e/fixtures/paypal-make-payment-form.html', request, response)
    }
    routes['/make-payment'] = async (request, response) => {
      const body = await httpUtils.collectRequestData(request)
      payment = await createPayment(
        ctpClient,
        adyenMerchantAccount,
        ctpProjectKey,
        body
      )
      const makePaymentResponse = payment.custom.fields.makePaymentResponse
      return httpUtils.sendResponse({
        response, data: makePaymentResponse
      })
    }
    const ctpConfig = config.getCtpConfig(ctpProjectKey)
    ctpClient = await ctpClientBuilder.get(ctpConfig)
    browser = await initPuppeteerBrowser()
  })

  afterEach(async () => {
    await browser.close()
  })

  it('when payment method is paypal and process is done correctly, ' +
    'then it should successfully finish the payment', async () => {
    const baseUrl = config.getModuleConfig().apiExtensionBaseUrl
    const browserTab = await browser.newPage()
    const clientKey =
      config.getAdyenConfig(adyenMerchantAccount).clientKey

    await makePayment({
      browserTab,
      baseUrl,
      clientKey
    })

    const pages = await browser.pages()
    const popup = pages[pages.length - 1]

    await handlePaypalPopUp(popup)

    const updatedPayment = await handleRedirect(browserTab)

    assertPayment(updatedPayment)
  })

  async function makePayment({browserTab, baseUrl, clientKey}) {
    paypalMakePaymentFormPage = new MakePaymentFormPage(browserTab, baseUrl)
    await paypalMakePaymentFormPage.goToThisPage()
    await paypalMakePaymentFormPage.generateAdyenMakePaymentForm(clientKey)
    await browserTab.waitForTimeout(2_000)
    await paypalMakePaymentFormPage.clickOnPaypalButton()
  }

  async function handlePaypalPopUp(browserTab) {
    const paypalPopupPage = new PaypalPopupPage(browserTab)
    await paypalPopupPage.handlePaypalPopUp()
  }

  async function handleRedirect() {
    const submitAdditionalPaymentDetailsRequest = await paypalMakePaymentFormPage.getAdditionalPaymentDetails()

    const {body: updatedPayment} = await ctpClient.update(
      ctpClient.builder.payments,
      payment.id,
      payment.version,
      [
        {
          action: 'setCustomField',
          name: 'submitAdditionalPaymentDetailsRequest',
          value: submitAdditionalPaymentDetailsRequest,
        },
      ]
    )
    return updatedPayment
  }

})
