const Promise = require('bluebird')

const interfaceInteractionTypes = require('../../../test/resources/payment-interface-interaction-types.json')

async function ensureInterfaceInteractionCustomType (ctpClient) {
  await Promise.map(interfaceInteractionTypes, async (type) => {
    try {
      const { body } = await ctpClient.fetch(ctpClient.builder.types.where(`key="${type.key}"`))
      if (body.results.length === 0)
        await ctpClient.create(ctpClient.builder.types, type)
    } catch (e) {
      console.error('Error when creating interface interaction custom type, skipping...', JSON.stringify(e))
    }
  }, { concurrency: 3 })
}

module.exports = {
  ensureInterfaceInteractionCustomType
}
