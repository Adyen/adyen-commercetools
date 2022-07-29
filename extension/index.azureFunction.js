import utils from './src/utils.js'
import paymentHandler from './src/paymentHandler/payment-handler.js'
import { getAuthorizationRequestHeader } from './src/validator/authentication.js'

export const azureExtensionTrigger = async function (context, event) {
  let paymentObj = {}
  try {
    const { body } = event
    paymentObj = body?.resource?.obj
    if (!paymentObj) {
      context.res = {
        body: {
          responseType: 'FailedValidation',
          errors: [
            {
              code: 'InvalidInput',
              message: 'Invalid event body',
            },
          ],
        },
      }
      return
    }

    const authToken = getAuthorizationRequestHeader(event)
    const paymentResult = await paymentHandler.handlePayment(
      paymentObj,
      authToken
    )
    context.res = {
      body: {
        responseType: paymentResult.actions
          ? 'UpdateRequest'
          : 'FailedValidation',
        errors: paymentResult.errors,
        actions: paymentResult.actions || [],
      },
    }
  } catch (e) {
    const errorObj = utils.handleUnexpectedPaymentError(paymentObj, e)
    errorObj.responseType = 'FailedValidation'
    context.res = {
      body: errorObj,
    }
  }
}
