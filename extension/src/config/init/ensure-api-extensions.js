const _ = require('lodash')
const utils = require('../../utils')

const apiExtensionTemplate = require('../../../resources/api-extension.json')

const logger = utils.getLogger()
async function ensureApiExtensions (ctpClient, ctpAdyenIntegrationBaseUrl) {
  try {
    const extensionDraft = _.template(JSON.stringify(apiExtensionTemplate))({ ctpAdyenIntegrationBaseUrl })
    const { body } = await ctpClient.fetch(ctpClient.builder.extensions.where(`key="${apiExtensionTemplate.key}"`))
    if (body.results.length === 0) {
      await ctpClient.create(ctpClient.builder.extensions, JSON.parse(extensionDraft))
      logger.info(`API extension (key=${apiExtensionTemplate.key}) was successfully created for payment resource type`)
    }
  } catch (e) {
    logger.error(e, `Error when creating API extension (key=${apiExtensionTemplate.key}) `
      + 'for payment resource type, skipping...')
  }
}

module.exports = {
  ensureApiExtensions
}
