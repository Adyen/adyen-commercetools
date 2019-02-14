function getChargeTransactionInitOrPending (paymentObject) {
  return paymentObject.transactions.find(t => t.type.toLowerCase() === 'charge'
    && (t.state.toLowerCase() === 'initial' || t.state.toLowerCase() === 'pending'))
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
  getMatchingCtpState
}
