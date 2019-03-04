function getChargeTransactionInitOrPending (paymentObject) {
  return getTransactionWithTypesAndStates(paymentObject,
    ['Charge'],
    ['Initial', 'Pending'])
}

function getChargeTransactionPending (paymentObject) {
  return getTransactionWithTypesAndStates(paymentObject,
    ['Charge'],
    ['Pending'])
}

function getChargeTransactionInit (paymentObject) {
  return getTransactionWithTypesAndStates(paymentObject,
    ['Charge'],
    ['Initial'])
}

function getTransactionWithTypesAndStates (paymentObject, types, states) {
  return paymentObject.transactions.find(t => types.includes(t.type)
    && (states.includes(t.state)))
}

// see https://docs.adyen.com/developers/payments-basics/payments-lifecycle
// and https://docs.adyen.com/developers/checkout/payment-result-codes
function getMatchingCtpState (adyenState) {
  const paymentAdyenStateToCtpState = {
    redirectshopper: 'Pending',
    received: 'Pending',
    pending: 'Pending',
    authorised: 'Success',
    refused: 'Failure',
    cancelled: 'Failure',
    error: 'Failure'
  }
  return paymentAdyenStateToCtpState[adyenState]
}

module.exports = {
  getChargeTransactionInitOrPending,
  getChargeTransactionPending,
  getChargeTransactionInit,
  getMatchingCtpState
}
