const { getLatestInterfaceInteraction } = require('../../src/paymentHandler/payment-utils')

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

function assertPayment (payment) {
  const { submitAdditionalPaymentDetailsResponse: submitAdditionalPaymentDetailsResponseString }
    = payment.custom.fields
  const submitAdditionalPaymentDetailsResponse = JSON.parse(submitAdditionalPaymentDetailsResponseString)
  expect(submitAdditionalPaymentDetailsResponse.resultCode).to.equal('Authorised',
    `resultCode is not Authorised: ${submitAdditionalPaymentDetailsResponseString}`)
  expect(submitAdditionalPaymentDetailsResponse.pspReference).to.match(/[A-Z0-9]+/,
    `pspReference does not match '/[A-Z0-9]+/': ${submitAdditionalPaymentDetailsResponseString}`)

  const submitAdditionalPaymentDetailsInteraction = getLatestInterfaceInteraction(payment.interfaceInteractions,
    'submitAdditionalPaymentDetails')
  expect(submitAdditionalPaymentDetailsInteraction.fields.response)
    .to.equal(submitAdditionalPaymentDetailsResponseString)

  expect(payment.transactions).to.have.lengthOf(1)
  const transaction = payment.transactions[0]
  expect(transaction.state).to.equal(c.CTP_TXN_STATE_SUCCESS)
  expect(transaction.type).to.equal('Authorization')
  expect(transaction.interactionId).to.equal(submitAdditionalPaymentDetailsResponse.pspReference)
  expect(transaction.amount.centAmount).to.equal(payment.amountPlanned.centAmount)
  expect(transaction.amount.currencyCode).to.equal(payment.amountPlanned.currencyCode)
}

module.exports = {
  pasteValue, executeInAdyenIframe, assertPayment
}
