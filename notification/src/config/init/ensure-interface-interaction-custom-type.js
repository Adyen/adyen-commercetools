const mainLogger = require('../../utils/logger').getLogger()

const interfaceInteractionType = require('../../../resources/payment-interface-interaction-type.json')
const config = require('../config')
const ctp = require('../../utils/ctp')

async function ensureInterfaceInteractionCustomType() {
  const commercetoolsProjectKeys = config.getAllCtpProjectKeys()
  for (const commercetoolsProjectKey of commercetoolsProjectKeys) {
    const ctpConfig = config.getCtpConfig(commercetoolsProjectKey)
    const ctpClient = ctp.get(ctpConfig)
    const logger = mainLogger.child({ commercetoolsProjectKey })
    try {
      if (!ctpConfig.ensureResources) return
      logger.debug('Ensuring interfaceInteraction')
      const { body } = await ctpClient.fetch(
        ctpClient.builder.types.where(`key="${interfaceInteractionType.key}"`)
      )
      if (body.results.length === 0) {
        logger.debug('Creating interface interaction')
        await ctpClient.create(
          ctpClient.builder.types,
          interfaceInteractionType
        )
        logger.info('Successfully created an interfaceInteraction type')
      }
    } catch (err) {
      logger.error(
        err,
        'Error when creating interface interaction custom type, skipping...'
      )
    }
  }
}

module.exports = {
  ensureInterfaceInteractionCustomType,
}
