const _ = require('lodash')
const { serializeError } = require('serialize-error')
const utils = require('../../utils')
const apiExtensionTemplate = require('../../../resources/api-extension.json')

const mainLogger = utils.getLogger()

async function ensureApiExtensions(
  ctpClient,
  ctpProjectKey,
  ctpAdyenIntegrationBaseUrl
) {
  try {
    const logger = mainLogger.child({
      commercetools_project_key: ctpProjectKey,
    })
    const extensionDraft = _.template(JSON.stringify(apiExtensionTemplate))({
      ctpAdyenIntegrationBaseUrl,
    })
    const existingExtension = await fetchExtensionByKey(
      ctpClient,
      apiExtensionTemplate.key
    )
    if (existingExtension === null) {
      await ctpClient.create(
        ctpClient.builder.extensions,
        JSON.parse(extensionDraft)
      )
      logger.info(
        'Successfully created an API extension for payment resource type ' +
          `(key=${apiExtensionTemplate.key}, url=${ctpAdyenIntegrationBaseUrl})`
      )
    } else if (
      hasDifferentDestinationUrl(existingExtension, ctpAdyenIntegrationBaseUrl)
    ) {
      existingExtension.destination.url = ctpAdyenIntegrationBaseUrl

      await ctpClient.update(
        ctpClient.builder.extensions,
        existingExtension.id,
        existingExtension.version,
        [
          {
            action: 'changeDestination',
            destination: existingExtension.destination,
          },
        ]
      )
      logger.info(
        'Successfully updated the API extension for payment resource type ' +
          `(key=${apiExtensionTemplate.key}, url=${ctpAdyenIntegrationBaseUrl})`
      )
    }
  } catch (err) {
    throw Error(
      `Failed to sync API extension (key=${apiExtensionTemplate.key}, url=${ctpAdyenIntegrationBaseUrl}). ` +
        `Error: ${JSON.stringify(serializeError(err))}`
    )
  }
}

function hasDifferentDestinationUrl(
  existingExtension,
  ctpAdyenIntegrationBaseUrl
) {
  if (existingExtension.destination.type === 'HTTP') {
    return existingExtension.destination.url !== ctpAdyenIntegrationBaseUrl
  }
  return false
}

async function fetchExtensionByKey(ctpClient, key) {
  try {
    const { body } = await ctpClient.fetchByKey(
      ctpClient.builder.extensions,
      key
    )
    return body
  } catch (err) {
    if (err.statusCode === 404) return null
    throw err
  }
}

module.exports = {
  ensureApiExtensions,
}
