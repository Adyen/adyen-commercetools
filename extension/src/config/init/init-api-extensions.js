const _ = require('lodash')

const apiExtensionTemplate = require('../../../resources/api-extension.json')

async function initApiExtensions (ctpClient, ctpAdyenIntegrationBaseUrl) {
  try {
    const extensionDraft = _.template(JSON.stringify(apiExtensionTemplate))({ ctpAdyenIntegrationBaseUrl })
    const { body: extension } = await ctpClient.create(ctpClient.builder.extensions, extensionDraft)
    await ctpClient.update(ctpClient.builder.extensions, extension.id, extension.version, [{
      action: 'setTimeoutInMs',
      timeoutInMs: 10000
    }])
  } catch (e) {
    console.error('Error when creating API extension, skipping...', JSON.stringify(e))
  }
}

module.exports = {
  initApiExtensions
}
