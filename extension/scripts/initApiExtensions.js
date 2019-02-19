const Promise = require('bluebird')
const _ = require('lodash')

const apiExtensionDrafts = require('../resources/api-extensions.json')

async function initApiExtensions (ctpClient, ctpAdyenIntegrationBaseUrl) {
  await Promise.map(apiExtensionDrafts.values(), async (uncompiledDraft) => {
    try {
      const extension = _.template(JSON.stringify(uncompiledDraft))({ ctpAdyenIntegrationBaseUrl })
      await ctpClient.create(ctpClient.builder.extensions, extension)
    } catch (e) {
      console.error('Error when creating interface interaction custom type, skipping...', JSON.stringify(e))
    }
  }, { concurrency: 3 })
}

module.exports = {
  initApiExtensions
}
