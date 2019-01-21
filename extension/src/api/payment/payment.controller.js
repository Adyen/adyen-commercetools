const httpUtils = require('../../service')

class PaymentController {
  handlePayment (request, response) {
    const paymentObject = this._getPaymentObject(request)
    const handler = this._getPaymentHandler(paymentObject)
    handler.execute(paymentObject)
    return httpUtils.sendResponse(response)
  }

  _getPaymentObject (request) {
    const requestData = httpUtils.collectRequestData(request)
    return requestData
  }

  _getPaymentHandler (paymentObject) {
  }
}

module.exports = new PaymentController()
