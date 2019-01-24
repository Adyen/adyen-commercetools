const httpUtils = require('../../utils')

async function handlePayment (request, response) {
  const paymentObject = await _getPaymentObject(request)
  //const handler = this._getPaymentHandler(paymentObject)
  //handler.execute(paymentObject)
  return httpUtils.sendResponse(response)
}

async function _getPaymentObject (request) {
  return httpUtils.collectRequestData(request)
}

function _getPaymentHandler (paymentObject) {
}

module.exports = { handlePayment }
