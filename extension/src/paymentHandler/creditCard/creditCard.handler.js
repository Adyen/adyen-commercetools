function isSupported (paymentObject) {
  return paymentObject.paymentMethodInfo.paymentInterface === 'ctp-adyen-integration'
    && paymentObject.paymentMethodInfo.method === 'creditCard'
}

async function handlePayment (paymentObject) {
}

module.exports = { isSupported, handlePayment }
