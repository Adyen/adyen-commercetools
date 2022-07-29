import utils from './src/utils.js'
import paymentHandler from './src/paymentHandler/payment-handler.js'
import { getAuthorizationRequestHeader } from './src/validator/authentication.js'

const FAILED_VALIDATION = 'FailedValidation'

function handleSuccessResponse(context, paymentResult) {
  context.res = {
    status: paymentResult.actions ? 200 : 400,
    responseType: paymentResult.actions ? 'UpdateRequest' : FAILED_VALIDATION,
    errors: paymentResult.errors,
    actions: paymentResult.actions || [],
  }
}

function handleErrorResponse(context, errors) {
  context.res = {
    status: 400,
    responseType: FAILED_VALIDATION,
    errors: errors,
  }
}

export const azureExtensionTrigger = async function (context, req) {
  const paymentObj = req.body?.resource?.obj
  if (!paymentObj) {
    const errors = [
      {
        code: 'InvalidInput',
        message: 'Invalid request body.',
      },
    ]
    handleErrorResponse(context, errors)
    return
  }

  const authToken = getAuthorizationRequestHeader(req)

  try {
    const paymentResult = await paymentHandler.handlePayment(
      paymentObj,
      authToken
    )
    handleSuccessResponse(context, paymentResult)
  } catch (e) {
    const errorObj = utils.handleUnexpectedPaymentError(paymentObj, e)
    handleErrorResponse(context, errorObj.errors)
  }
}
