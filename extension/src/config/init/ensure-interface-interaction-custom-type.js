const Promise = require('bluebird')
const utils = require('../../utils')

const interfaceInteractionTypes = require('../../../resources/payment-interface-interaction-types.json')

const logger = utils.getLogger()

async function ensureInterfaceInteractionCustomType (ctpClient) {
  await Promise.map(interfaceInteractionTypes, async (type) => {
    try {
      const { body } = await ctpClient.fetch(ctpClient.builder.types.where(`key="${type.key}"`))
      if (body.results.length === 0) {
        await ctpClient.create(ctpClient.builder.types, type)
        logger.info('Successfully created an interfaceInteraction type')
      }
    } catch (e) {
      logger.error('Error when creating interface interaction custom type, skipping...', JSON.stringify(e))
    }
  }, { concurrency: 3 })
}

module.exports = {
  ensureInterfaceInteractionCustomType
}
