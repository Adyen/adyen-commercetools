const paymentCustomType = require('../../../resources/web-components-payment-type.json')

const utils = require('../../utils')

const mainLogger = utils.getLogger()

async function ensurePaymentCustomType(ctpClient, ctpProjectKey) {
  const logger = mainLogger.child({
    commercetools_project_key: ctpProjectKey,
  })
  const { body } = await ctpClient.fetch(
    ctpClient.builder.types.where(`key="${paymentCustomType.key}"`)
  )
  if (body.results.length === 0) {
    await ctpClient.create(ctpClient.builder.types, paymentCustomType)
    logger.info(
      `Successfully created a payment type (key=${paymentCustomType.key})`
    )
  }
}

module.exports = {
  ensurePaymentCustomType,
}
