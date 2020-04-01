const utils = require('../../utils')

const interfaceInteractionType = require('../../../resources/payment-interface-interaction-type.json')

const logger = utils.getLogger()

async function ensureInterfaceInteractionCustomType (ctpClient) {
  try {
    const { body } = await ctpClient.fetch(ctpClient.builder.types.where(`key="${interfaceInteractionType.key}"`))
    if (body.results.length === 0) {
      await ctpClient.create(ctpClient.builder.types, interfaceInteractionType)
      logger.info('Successfully created an interfaceInteraction type')
    }
  } catch (e) {
    logger.error(e, 'Error when creating interface interaction custom type, skipping...')
  }
}

module.exports = {
  ensureInterfaceInteractionCustomType
}
