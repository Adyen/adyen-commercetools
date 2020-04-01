const utils = require('../../utils')

const interfaceInteractionType = require('../../../resources/payment-interface-interaction-type.json')

const logger = utils.getLogger()

async function ensureInterfaceInteractionCustomType (ctpClient) {
  try {
    const { body } = await ctpClient.fetch(ctpClient.builder.types.where(`key="${interfaceInteractionType.key}"`))
    if (body.results.length === 0) {
      await ctpClient.create(ctpClient.builder.types, interfaceInteractionType)
      logger.info('Successfully created a payment interface interaction'
        + `type (key=${interfaceInteractionType.key})`)
    }
  } catch (e) {
    logger.error(e, `Error when creating payment interface interaction type (key=${interfaceInteractionType.key}), `
     + 'skipping the creation...')
  }
}

module.exports = {
  ensureInterfaceInteractionCustomType
}
