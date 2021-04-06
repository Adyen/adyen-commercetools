const utils = require('./src/utils')
const paymentHandler = require('./src/paymentHandler/payment-handler')
const auth = require('./src/validator/authentication')

const logger = utils.getLogger()

exports.handler = async (event) => {
  let paymentObj = {}
  try {
    const body = event.body ? JSON.parse(event.body) : event
    paymentObj = body?.resource?.obj
    if (!paymentObj)
      return {
        responseType: 'FailedValidation',
        errors: [
          {
            code: 'InvalidInput',
            message: `Invalid event body`,
          },
        ],
      }

    const authToken = auth.getAuthorizationRequestHeader(event)
    const paymentResult = await paymentHandler.handlePayment(
      paymentObj,
      authToken
    )
    return {
      responseType: paymentResult.success
        ? 'UpdateRequest'
        : 'FailedValidation',
      // paymentResult.data can be null when paymentHandler short-circuits on non-Adyen payment
      errors: paymentResult.data ? paymentResult.data.errors : undefined,
      actions: paymentResult.data ? paymentResult.data.actions : [],
    }
  } catch (e) {
    const errorObj = utils.handleUnexpectedPaymentError(paymentObj, e)
    errorObj.responseType = 'FailedValidation'
    console.log('******')
    console.log(errorObj)
    return errorObj
  }
}
