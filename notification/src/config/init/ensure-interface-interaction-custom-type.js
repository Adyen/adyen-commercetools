import { createSyncTypes } from '@commercetools/sync-actions'
import { serializeError } from 'serialize-error'
import { getLogger } from '../../utils/logger.js'
import config from '../config.js'
import ctp from '../../utils/ctp.js'
import utils from '../../utils/commons.js'

const mainLogger = getLogger()

async function ensureInterfaceInteractionCustomTypeForAllProjects() {
  const commercetoolsProjectKeys = config.getAllCtpProjectKeys()
  for (const commercetoolsProjectKey of commercetoolsProjectKeys) {
    const ctpConfig = config.getCtpConfig(commercetoolsProjectKey)
    const ctpClient = await ctp.get(ctpConfig)
    await ensureInterfaceInteractionCustomType(ctpClient, ctpConfig.projectKey)
  }
}

async function ensureInterfaceInteractionCustomType(ctpClient, ctpProjectKey) {
  const interfaceInteractionType = await utils.readAndParseJsonFile(
    'resources/payment-interface-interaction-type.json',
  )
  return syncCustomType(
    ctpClient,
    createChildLogger(ctpProjectKey),
    interfaceInteractionType,
  )
}

function createChildLogger(ctpProjectKey) {
  return mainLogger.child({
    commercetools_project_key: ctpProjectKey,
  })
}

async function syncCustomType(ctpClient, logger, typeDraft) {
  try {
    const existingType = await fetchTypeByKey(ctpClient, typeDraft.key)
    if (existingType === null) {
      await ctpClient.create(ctpClient.builder.types, typeDraft)
      logger.info(`Successfully created the type (key=${typeDraft.key})`)
    } else {
      const syncTypes = createSyncTypes()
      const updateActions = syncTypes
        .buildActions(typeDraft, existingType)
        .filter((i) => i.action !== 'changeFieldDefinitionOrder')
      if (updateActions.length > 0) {
        await ctpClient.update(
          ctpClient.builder.types,
          existingType.id,
          existingType.version,
          updateActions,
        )
        logger.info(`Successfully updated the type (key=${typeDraft.key})`)
      }
    }
  } catch (err) {
    throw Error(
      `Failed to sync payment type (key=${typeDraft.key}). ` +
        `Error: ${JSON.stringify(serializeError(err))}`,
    )
  }
}

async function fetchTypeByKey(ctpClient, key) {
  try {
    const { body } = await ctpClient.fetchByKey(ctpClient.builder.types, key)
    return body
  } catch (err) {
    if (err.statusCode === 404) return null
    throw err
  }
}

export {
  ensureInterfaceInteractionCustomTypeForAllProjects,
  ensureInterfaceInteractionCustomType,
}
