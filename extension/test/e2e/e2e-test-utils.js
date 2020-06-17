// eslint-disable-next-line import/no-extraneous-dependencies
const { expect } = require('chai')
const { getLatestInterfaceInteraction } = require('../../src/paymentHandler/payment-utils')
const c = require('../../src/config/constants')

async function pasteValue (page, selector, value) {
  return page.evaluate((data) => {
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
  expect(transaction.state).to.equal(c.CTP_TXN_STATE_SUCCESS)
  expect(transaction.type).to.equal('Authorization')
  expect(transaction.interactionId).to.equal(finalAdyenPaymentResponse.pspReference)
  expect(transaction.amount.centAmount).to.equal(payment.amountPlanned.centAmount)
  expect(transaction.amount.currencyCode).to.equal(payment.amountPlanned.currencyCode)
}

module.exports = {
  pasteValue, executeInAdyenIframe, assertPayment
}
