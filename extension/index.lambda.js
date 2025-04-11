import utils from './src/utils.js'
import paymentHandler from './src/paymentHandler/payment-handler.js'
import { getAuthorizationRequestHeader } from './src/validator/authentication.js'

const logger = utils.getLogger()

let handler = async (event) => {
  let paymentObj = {}
  try {
    const body = event.body ? JSON.parse(event.body) : event
    paymentObj = body?.resource?.obj
    if (!paymentObj) {
      const responseBody = {
        responseType: 'FailedValidation',
        errors: [
          {
            code: 'InvalidInput',
            message: `Invalid event body`,
          },
        ],
      }

      return {
        statusCode: 200,
        isBase64Encoded: false,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(responseBody),
      }
    }

    const authToken = getAuthorizationRequestHeader(event)

    logger.debug('Received payment object', JSON.stringify(paymentObj))

    const paymentResult = await paymentHandler.handlePayment(
      paymentObj,
      authToken,
    )
    const responseBody = {
      responseType: paymentResult.actions
        ? 'UpdateRequest'
        : 'FailedValidation',
      errors: paymentResult.errors,
      actions: paymentResult.actions || [],
    }

    logger.debug('Data to be returned', JSON.stringify(responseBody))

    return {
      statusCode: 200,
      isBase64Encoded: false,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(responseBody),
    }
  } catch (e) {
    const errorObj = utils.handleUnexpectedPaymentError(paymentObj, e)
    errorObj.responseType = 'FailedValidation'

    return {
      statusCode: 200,
      isBase64Encoded: false,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(errorObj),
    }
  }
}

export { handler }
