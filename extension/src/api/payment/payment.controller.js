const httpUtils = require('../../utils')

function handlePayment (request, response) {
  const paymentObject = this._getPaymentObject(request)
  const handler = this._getPaymentHandler(paymentObject)
  handler.execute(paymentObject)
  return httpUtils.sendResponse(response)
}

function _getPaymentObject (request) {
  const requestData = httpUtils.collectRequestData(request)
  return requestData
}

function _getPaymentHandler (paymentObject) {
}

module.exports = { handlePayment }
