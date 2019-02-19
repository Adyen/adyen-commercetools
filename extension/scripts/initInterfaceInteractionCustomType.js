const Promise = require('bluebird')

const interfaceInteractionTypes = require('../resources/payment-interface-interaction-types.json')

async function initInterfaceInteractionCustomType (ctpClient) {
  await Promise.map(interfaceInteractionTypes.values(), async (type) => {
    try {
      await ctpClient.create(ctpClient.builder.types, type)
    } catch (e) {
      console.error('Error when creating interface interaction custom type, skipping...', JSON.stringify(e))
    }
  }, { concurrency: 3 })
}

module.exports = {
  initInterfaceInteractionCustomType
}
