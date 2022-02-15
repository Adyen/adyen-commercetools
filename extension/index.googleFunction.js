import paymentHandler from './src/paymentHandler/payment-handler'
import utils from './src/utils.mjs'
import auth from './src/validator/authentication'

export let extensionTrigger = async (request, response) => {
  const paymentObj = request?.body?.resource?.obj
  try {
    if (!paymentObj) {
      return response.status(400).send({
        errors: [
          {
            code: 'InvalidInput',
            message: 'Invalid body payload.',
          },
        ],
      })
    }
    const authToken = auth.getAuthorizationRequestHeader(request)
    const paymentResult = await paymentHandler.handlePayment(
      paymentObj,
      authToken
    )
    if (paymentResult.actions) {
      return response.status(200).send({
        actions: paymentResult.actions || [],
      })
    }
    return response.status(400).send({
      errors: paymentResult.errors,
    })
  } catch (err) {
    return response
      .status(400)
      .send(utils.handleUnexpectedPaymentError(paymentObj, err))
  }
}
