const paymentCustomType = require('../../../resources/web-components-payment-type')

const utils = require('../../utils')

const logger = utils.getLogger()

async function ensurePaymentCustomType (ctpClient) {
  try {
    const { body } = await ctpClient.fetch(ctpClient.builder.types.where(`key="${paymentCustomType.key}"`))
    if (body.results.length === 0) {
      await ctpClient.create(ctpClient.builder.types, paymentCustomType)
      logger.info(`Successfully created a payment type (key=${paymentCustomType.key})`)
    }
  } catch (e) {
    logger.error(e, `Error when creating payment type (key=${paymentCustomType.key}),  `
      + 'skipping...')
  }
}

module.exports = {
  ensurePaymentCustomType
}
