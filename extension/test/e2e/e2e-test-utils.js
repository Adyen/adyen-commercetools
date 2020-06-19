// eslint-disable-next-line import/no-extraneous-dependencies
const { expect } = require('chai')
// eslint-disable-next-line import/no-extraneous-dependencies
const puppeteer = require('puppeteer')
const { getLatestInterfaceInteraction } = require('../../src/paymentHandler/payment-utils')
const c = require('../../src/config/constants')

async function pasteValue (page, selector, value) {
  return page.evaluate((data) => {
    // eslint-disable-next-line no-undef
    document.querySelector(data.selector).value = data.value
  }, { selector, value })
}

async function executeInAdyenIframe (page, selector, executeFn) {
  for (const frame of page.mainFrame().childFrames()) {
    const elementHandle = await frame.$(selector)
    if (elementHandle) {
      await executeFn(elementHandle)
      break
    }
  }
}

async function initPuppeteerBrowser () {
  return puppeteer.launch({
    headless: true,
    ignoreHTTPSErrors: true,
    args: ['--disable-web-security', '--disable-features=IsolateOrigins,site-per-process']
  })
}

function assertPayment (payment, finalAdyenPaymentInteractionName = 'submitAdditionalPaymentDetails') {
  const { [`${finalAdyenPaymentInteractionName}Response`]: finalAdyenPaymentResponseString }
    = payment.custom.fields
  const finalAdyenPaymentResponse = JSON.parse(finalAdyenPaymentResponseString)
  expect(finalAdyenPaymentResponse.resultCode).to.equal('Authorised',
    `resultCode is not Authorised: ${finalAdyenPaymentResponseString}`)
  expect(finalAdyenPaymentResponse.pspReference).to.match(/[A-Z0-9]+/,
    `pspReference does not match '/[A-Z0-9]+/': ${finalAdyenPaymentResponseString}`)

  const finalAdyenPaymentInteraction = getLatestInterfaceInteraction(payment.interfaceInteractions,
    finalAdyenPaymentInteractionName)
  expect(finalAdyenPaymentInteraction.fields.response)
    .to.equal(finalAdyenPaymentResponseString)

  expect(payment.transactions).to.have.lengthOf(1)
  const transaction = payment.transactions[0]
  expect(transaction.state).to.equal('Success')
  expect(transaction.type).to.equal('Authorization')
  expect(transaction.interactionId).to.equal(finalAdyenPaymentResponse.pspReference)
  expect(transaction.amount.centAmount).to.equal(payment.amountPlanned.centAmount)
  expect(transaction.amount.currencyCode).to.equal(payment.amountPlanned.currencyCode)
}

async function createPaymentWithOriginKeyResponse (ctpClient, baseUrl) {
  const getOriginKeysRequestDraft = {
    originDomains: [
      baseUrl
    ]
  }
  const paymentDraft = {
    amountPlanned: {
      currencyCode: 'EUR',
      centAmount: 1000,
    },
    paymentMethodInfo: {
      paymentInterface: c.CTP_ADYEN_INTEGRATION
    },
    custom: {
      type: {
        typeId: 'type',
        key: c.CTP_PAYMENT_CUSTOM_TYPE_KEY
      },
      fields: {
        getOriginKeysRequest: JSON.stringify(getOriginKeysRequestDraft)
      }
    }
  }

  const { body: payment } = await ctpClient.create(ctpClient.builder.payments, paymentDraft)
  return payment
}

module.exports = {
  pasteValue, executeInAdyenIframe, assertPayment, createPaymentWithOriginKeyResponse, initPuppeteerBrowser
}
