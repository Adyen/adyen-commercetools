const _ = require('lodash')

const apiExtensionTemplate = require('../../../resources/api-extension.json')

async function ensureApiExtensions (ctpClient, ctpAdyenIntegrationBaseUrl) {
  try {
    const extensionDraft = _.template(JSON.stringify(apiExtensionTemplate))({ ctpAdyenIntegrationBaseUrl })
    const { body } = await ctpClient.fetch(ctpClient.builder.extensions.where(`key="${apiExtensionTemplate.key}"`))
    if (body.results.length === 0)
      await ctpClient.create(ctpClient.builder.extensions, extensionDraft)
  } catch (e) {
    console.error('Error when creating API extension, skipping...', JSON.stringify(e))
  }
}

module.exports = {
  ensureApiExtensions
}
