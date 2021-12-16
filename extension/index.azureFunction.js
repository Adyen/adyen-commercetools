const utils = require('./src/utils');
const paymentHandler = require('./src/paymentHandler/payment-handler');
const auth = require('./src/validator/authentication');

module.exports = async function (context, event) {
  let paymentObj = {};
  try {
    const { body } = event;
    paymentObj = body?.resource?.obj;
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
        }
      };
      return
    }

    const authToken = auth.getAuthorizationRequestHeader(event);
    const paymentResult = await paymentHandler.handlePayment(
        paymentObj,
        authToken,
    );
    context.res = {
      body: {
        responseType: paymentResult.actions
            ? 'UpdateRequest'
            : 'FailedValidation',
        errors: paymentResult.errors,
        actions: paymentResult.actions || [],
      }
    };
  } catch (e) {
    const errorObj = utils.handleUnexpectedPaymentError(paymentObj, e);
    errorObj.responseType = 'FailedValidation';
    context.res = {
      body: errorObj
    };
  }
};
