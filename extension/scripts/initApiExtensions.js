const _ = require('lodash')

const apiExtensionDraft = require('../resources/api-extension.json')

async function initApiExtensions (ctpClient, ctpAdyenIntegrationBaseUrl) {
  try {
    const extension = _.template(JSON.stringify(apiExtensionDraft))({ ctpAdyenIntegrationBaseUrl })
    await ctpClient.create(ctpClient.builder.extensions, extension)
  } catch (e) {
    console.error('Error when creating API extension, skipping...', JSON.stringify(e))
  }
}

module.exports = {
  initApiExtensions
}
