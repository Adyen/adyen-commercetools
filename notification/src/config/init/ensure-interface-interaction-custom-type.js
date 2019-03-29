const logger = require('../../utils/logger').getLogger()

const interfaceInteractionType = require('../../../resources/payment-interface-interaction-type.json')

async function ensureInterfaceInteractionCustomType (ctpClient) {
  try {
    logger.debug('Ensuring interfaceInteraction')
    const { body } = await ctpClient.fetch(ctpClient.builder.types.where(`key="${interfaceInteractionType.key}"`))
    if (body.results.length === 0) {
      logger.debug('Creating interface interaction')
      await ctpClient.create(ctpClient.builder.types, interfaceInteractionType)
      logger.info('Successfully created an interfaceInteraction type')
    }
  } catch (e) {
    logger.error('Error when creating interface interaction custom type, skipping...', JSON.stringify(e))
  }
}

module.exports = {
  ensureInterfaceInteractionCustomType
}
