const paymentCustomType = require('../../resources/payment-custom-type.json')

const utils = require('../../../src/utils/logger')

const logger = utils.getLogger()

async function ensurePaymentCustomType (ctpClient) {
  try {
    const { body } = await ctpClient.fetch(ctpClient.builder.types.where(`key="${paymentCustomType.key}"`))
    if (body.results.length === 0) {
      await ctpClient.create(ctpClient.builder.types, paymentCustomType)
      logger.info('Successfully created payment custom type')
    }
  } catch (e) {
    logger.error(e, 'Error when creating payment custom type, skipping...')
  }
}

module.exports = {
  ensurePaymentCustomType
}
