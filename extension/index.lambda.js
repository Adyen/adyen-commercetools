import utils from './src/utils.js'
import paymentHandler from './src/paymentHandler/payment-handler.js'
import { getAuthorizationRequestHeader } from './src/validator/authentication.js'

let handler = async (event) => {
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

    const authToken = getAuthorizationRequestHeader(event)
    const paymentResult = await paymentHandler.handlePayment(
      paymentObj,
      authToken,
    )
    return {
      responseType: paymentResult.actions
        ? 'UpdateRequest'
        : 'FailedValidation',
      errors: paymentResult.errors,
      actions: paymentResult.actions || [],
    }
  } catch (e) {
    const errorObj = utils.handleUnexpectedPaymentError(paymentObj, e)
    errorObj.responseType = 'FailedValidation'
    return errorObj
  }
}

export { handler }
