import localtunnel from 'localtunnel'
import { serializeError } from 'serialize-error'
import fetch from 'node-fetch'
import { setupServer } from '../src/server.js'
import { routes } from '../src/routes.js'
import { setupExtensionResources } from '../src/setup.js'
import config from '../src/config/config.js'

global.window = {}
global.navigator = {}

process.on('unhandledRejection', (reason) => {
  /* eslint-disable no-console */
  console.error('Unhandled Rejection:', reason)
  process.exit(1)
})

const extensionPort = 3000
let extensionTunnel
let extensionServer

const notificationPort = 3001
let notificationTunnel
let notificationServer
const merchantIdToWebhookIdMap = new Map()

async function startIT() {
  await setupLocalServer()
  if (process.env.CI) {
    // this part used only on github actions (CI)
    await setupExtensionResources(process.env.CI_EXTENSION_BASE_URL)
    // e2e requires this for static forms
    overrideApiExtensionBaseUrlConfig(`http://localhost:${extensionPort}`)
  } else {
    await setupLocalTunnel()
    await setupExtensionResources()
    await setUpWebhooksAndNotificationModule()
  }
}

async function stopIT() {
  extensionServer.close()
  if (!process.env.CI) {
    // this part is not used on github actions (CI)
    notificationServer.close()
    await extensionTunnel.close()
    await notificationTunnel.close()
  }

  // If you don't delete the webhooks, other tests will pollute this webhook with many notifications
  // the webhook will get stuck and your test might not get the notifications next time.
  await deleteWebhooks()
}

function setupLocalServer() {
  extensionServer = setupServer(routes)
  return new Promise((resolve) => {
    extensionServer.listen(extensionPort, async () => {
      resolve()
    })
  })
}

function overrideApiExtensionBaseUrlConfig(apiExtensionBaseUrl) {
  const moduleConfig = config.getModuleConfig()
  moduleConfig.apiExtensionBaseUrl = apiExtensionBaseUrl
  config.getModuleConfig = function getModuleConfig() {
    return moduleConfig
  }
}

function overrideGenerateIdempotencyKeyConfig(generateIdempotencyKey) {
  const moduleConfig = config.getModuleConfig()
  moduleConfig.generateIdempotencyKey = generateIdempotencyKey
  config.getModuleConfig = function getModuleConfig() {
    return moduleConfig
  }
}

function overrideEnableHmacSignatureConfig(enableHmacSignature) {
  const adyenMerchantAccounts = config.getAllAdyenMerchantAccounts()
  const updatedAdyenMerchantAccounts = new Map()
  for (const adyenMerchantId of adyenMerchantAccounts) {
    const adyenConfig = config.getAdyenConfig(adyenMerchantId)
    adyenConfig.enableHmacSignature = enableHmacSignature
    updatedAdyenMerchantAccounts.set(adyenMerchantId, adyenConfig)
  }
  config.getAdyenConfig = function getAdyenConfig(adyenMerchantId) {
    return updatedAdyenMerchantAccounts.get(adyenMerchantId)
  }
}

async function setupLocalTunnel() {
  const extensionTunnelDomain = 'ctp-adyen-integration-tests'
  extensionTunnel = await initTunnel(extensionTunnelDomain, extensionPort)
  const apiExtensionBaseUrl = extensionTunnel.url.replace('http:', 'https:')
  overrideApiExtensionBaseUrlConfig(apiExtensionBaseUrl)
}

async function initTunnel(subdomain, port) {
  let repeaterCounter = 0
  // eslint-disable-next-line no-shadow
  let tunnel
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      tunnel = await localtunnel({
        port,
        subdomain,
      })
      break
    } catch (e) {
      if (repeaterCounter === 10) throw e
      repeaterCounter++
    }
  }
  return tunnel
}

async function updatePaymentWithRetry(ctpClient, actions, payment) {
  let version = payment.version
  let statusCode
  let updatedPayment
  while (true) {
    try {
      const response = await ctpClient.update(
        ctpClient.builder.payments,
        payment.id,
        version,
        actions,
      )
      statusCode = response.statusCode
      updatedPayment = response.body
      break
    } catch (e) {
      if (e.statusCode === 409) {
        const { body } = await ctpClient.fetchById(
          ctpClient.builder.payments,
          payment.id,
        )
        version = body.version
      } else {
        throw e
      }
    }
  }
  return { statusCode, updatedPayment }
}

async function ensureAdyenWebhookForAllAdyenAccounts(webhookUrl) {
  overrideEnableHmacSignatureConfig(false)
  const adyenMerchantAccounts = config.getAllAdyenMerchantAccounts()
  const ctpProjectKeys = config.getAllCtpProjectKeys()
  for (const ctpProjectKey of ctpProjectKeys) {
    const webhookUrlWithProjectKey = `${webhookUrl}/${ctpProjectKey}`
    for (const adyenMerchantId of adyenMerchantAccounts) {
      const adyenConfig = config.getAdyenConfig(adyenMerchantId)
      const webhookId = await ensureAdyenWebhook(
        adyenConfig.apiKey,
        webhookUrlWithProjectKey,
        adyenMerchantId,
      )
      merchantIdToWebhookIdMap.set(adyenMerchantId, webhookId)
    }
  }
}

async function setUpWebhooksAndNotificationModule() {
  const notificationTunnelDomain = 'ctp-adyen-integration-tests-notifications'
  // Starting up server is needed only locally, on CI we deploy to GCP
  const { setupServer: setupNotificationModuleServer } = await import(
    // eslint-disable-next-line import/no-relative-packages
    '../../notification/src/server.js'
  )
  notificationServer = await setupNotificationModuleServer()
  await new Promise((resolve) => {
    notificationServer.listen(notificationPort, async () => {
      resolve()
    })
  })

  const webhookUrl = `https://${notificationTunnelDomain}.loca.lt`
  await ensureAdyenWebhookForAllAdyenAccounts(webhookUrl)
  notificationTunnel = await initTunnel(
    notificationTunnelDomain,
    notificationPort,
  )
}

async function deleteWebhooks() {
  const adyenMerchantAccounts = config.getAllAdyenMerchantAccounts()
  for (const adyenMerchantId of adyenMerchantAccounts) {
    const adyenConfig = config.getAdyenConfig(adyenMerchantId)
    const webhookId = merchantIdToWebhookIdMap.get(adyenMerchantId)
    await fetch(
      `https://management-test.adyen.com/v1/merchants/${adyenMerchantId}/webhooks/${webhookId}`,
      {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': adyenConfig.apiKey,
        },
      },
    )
  }
}

async function waitUntil(
  waitCondition,
  maxRetry = 15,
  maxWaitingTimePerRetryInMs = 32000,
) {
  let counter = 0
  while (true) {
    const waitConditionResult = await waitCondition()
    if (waitConditionResult) return waitConditionResult
    if (counter >= maxRetry) return undefined

    await sleep(Math.min(2 * counter * 1000, maxWaitingTimePerRetryInMs))
    counter++
  }
}

async function sleep(ms) {
  await new Promise((resolve) => {
    setTimeout(() => resolve(), ms)
  })
}

/**
 * This method is copied from notification module. The reason is we cannot import
 * JS files from another modules.
 */
async function ensureAdyenWebhook(adyenApiKey, webhookUrl, merchantId) {
  try {
    const webhookConfig = {
      type: 'standard',
      url: webhookUrl,
      active: 'true',
      communicationFormat: 'json',
      description: 'commercetools-adyen-integration notification webhook',
    }

    const getWebhookResponse = await fetch(
      `https://management-test.adyen.com/v1/merchants/${merchantId}/webhooks`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': adyenApiKey,
        },
      },
    )
    const getWebhookResponseJson = await getWebhookResponse.json()

    const existingWebhook = getWebhookResponseJson.data?.find(
      (webhook) =>
        webhook.url === webhookConfig.url &&
        webhook.type === webhookConfig.type,
    )

    if (existingWebhook) {
      if (!existingWebhook.active)
        await fetch(
          `https://management-test.adyen.com/v1/merchants/${merchantId}/webhooks/${existingWebhook.id}`,
          {
            body: JSON.stringify({
              active: true,
            }),
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'X-Api-Key': adyenApiKey,
            },
          },
        )
      return existingWebhook.id
    }

    const createWebhookResponse = await fetch(
      `https://management-test.adyen.com/v1/merchants/${merchantId}/webhooks`,
      {
        body: JSON.stringify(webhookConfig),
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': adyenApiKey,
        },
      },
    )

    const createWebhookResponseJson = await createWebhookResponse.json()
    const webhookId = createWebhookResponseJson.id
    return webhookId
  } catch (err) {
    throw Error(
      `Failed to ensure adyen webhook for project ${merchantId}.` +
        `Error: ${JSON.stringify(serializeError(err))}`,
    )
  }
}

async function fetchNotificationInterfaceInteraction(
  ctpClient,
  paymentId,
  status = 'authorisation',
) {
  const { body } = await ctpClient.fetchById(
    ctpClient.builder.payments,
    paymentId,
  )
  return body.interfaceInteractions.find(
    (interaction) =>
      interaction.fields.type === 'notification' &&
      interaction.fields.status === status,
  )
}

export {
  startIT,
  stopIT,
  updatePaymentWithRetry,
  overrideGenerateIdempotencyKeyConfig,
  waitUntil,
  fetchNotificationInterfaceInteraction,
}
