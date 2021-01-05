const utils = require('../../utils')

const interfaceInteractionType = require('../../../resources/payment-interface-interaction-type.json')

const logger = utils.getLogger()

async function ensureInterfaceInteractionCustomType(ctpClient) {
  const { body } = await ctpClient.fetch(
    ctpClient.builder.types.where(`key="${interfaceInteractionType.key}"`)
  )
  if (body.results.length === 0) {
    await ctpClient.create(ctpClient.builder.types, interfaceInteractionType)
    logger.info(
      'Successfully created a payment interface interaction' +
        `type (key=${interfaceInteractionType.key})`
    )
  }
}

module.exports = {
  ensureInterfaceInteractionCustomType,
}
