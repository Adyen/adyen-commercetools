const Promise = require('bluebird')

const paymentCustomTypes = require('../../../resources/payment-custom-types.json')

async function initPaymentCustomType (ctpClient) {
  await Promise.map(paymentCustomTypes.values(), async (type) => {
    try {
      await ctpClient.create(ctpClient.builder.types, type)
    } catch (e) {
      console.log('Error when creating payment custom type, skipping...', JSON.stringify(e))
    }
  }, { concurrency: 3 })
}

module.exports = {
  initPaymentCustomType
}
