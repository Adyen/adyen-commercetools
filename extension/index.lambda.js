import utils from './src/utils.js'
import paymentHandler from './src/paymentHandler/payment-handler.js'
import { getAuthorizationRequestHeader } from './src/validator/authentication.js'

const logger = utils.getLogger()

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

    logger.debug('Received payment object', JSON.stringify(paymentObj))

    const paymentResult = await paymentHandler.handlePayment(
      paymentObj,
      authToken,
    )
    const result = {
      responseType: paymentResult.actions
        ? 'UpdateRequest'
        : 'FailedValidation',
      errors: paymentResult.errors,
      actions: paymentResult.actions || [],
    }

    logger.debug('Data to be returned', JSON.stringify(result))

    return result
  } catch (e) {
    const errorObj = utils.handleUnexpectedPaymentError(paymentObj, e)
    errorObj.responseType = 'FailedValidation'
    return errorObj
  }
}

export { handler }
