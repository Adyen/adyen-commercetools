const _ = require('lodash')
const { address } = require('ip')
const { hmacValidator } = require('@adyen/api-library')
const fetch = require('node-fetch')
const config = require('../src/config/config')
const concurrentModificationError = require('./resources/concurrent-modification-exception.json')
const serverBuilder = require('../src/server')
const { setupNotificationResources } = require('../src/setup')
const payment = require('./resources/payment-draft.json')
const {
  startFakeExtension,
  stopFakeExtension,
} = require('./fake-extension-service')

process.on('unhandledRejection', (reason) => {
  /* eslint-disable no-console */
  console.error('Unhandled Rejection:', reason)
  process.exit(1)
})

let originalGetAdyenConfigFn

function overrideAdyenConfig(newAdyenConfig) {
  originalGetAdyenConfigFn = config.getAdyenConfig
  config.getAdyenConfig = () => newAdyenConfig
  module.exports = config
}

function restoreAdyenConfig() {
  config.getAdyenConfig = originalGetAdyenConfigFn
  module.exports = config
}

function buildMockErrorFromConcurrentModificaitonException() {
  const error = new Error(concurrentModificationError.message)
  error.body = concurrentModificationError.body
  error.name = concurrentModificationError.name
  error.code = concurrentModificationError.code
  error.status = concurrentModificationError.status
  error.statusCode = concurrentModificationError.statusCode
  error.originalRequest = concurrentModificationError.originalRequest
  error.retryCount = concurrentModificationError.retryCount
  error.headers = concurrentModificationError.headers
  return error
}

// node-fetch package doesn't support requests to localhost, therefore
// we need to provide the IP behind localhost
const localhostIp = address()

async function startIT() {
  // await setupWebhooks()
  await setupNotificationResources()
  if (!process.env.CI) {
    await setupLocalServer(8000)
    await startFakeExtension()
  }
}

function getNotificationURL() {
  if (!process.env.CI) {
    return `http://${localhostIp}:8000`
  }
  return process.env.CI_NOTIFICATION_URL
}

let server

async function setupLocalServer(testServerPort = 8000) {
  server = serverBuilder.setupServer()
  return new Promise((resolve) => {
    server.listen(testServerPort, async () => {
      resolve()
    })
  })
}

async function setupWebhooks() {
  const merchantAccounts = config.getAllAdyenMerchantAccounts()
  const merchantAccount = merchantAccounts[0]
  const adyenConfig = config.getAdyenConfig(merchantAccount)

  const request = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': adyenConfig.apiKey,
    },
  }

  const webhookUrl = `${adyenConfig.apiManagementUrl}/merchants/${merchantAccount}/webhooks`
  const getWebhookResponse = await fetch(webhookUrl, request)
  const getWebhookResponseJson = await getWebhookResponse.json()

  const existingWebhook = getWebhookResponseJson.data.find(
    (hook) =>
      hook.type === 'standard' &&
      hook.url === adyenConfig.notificationModuleBaseUrl
  )
  if (!existingWebhook) {
    const createWebhookRequestBody = {
      type: 'standard',
      url: 'https://www.test.com',
      active: 'true',
      communicationFormat: 'json',
    }

    const createWebhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      body: JSON.stringify(createWebhookRequestBody),
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': adyenConfig.apiKey,
      },
    })
    const createWebhookResponseJson = await createWebhookResponse.json()

    const generateHmacLink = createWebhookResponseJson._links.generateHmac.href
    const generateHmacResponse = await fetch(generateHmacLink, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': adyenConfig.apiKey,
      },
    })
    const generateHmacResponseJson = await generateHmacResponse.json()
    const { hmacKey } = generateHmacResponseJson
    console.log(hmacKey)
  }
}

async function stopIT() {
  if (!process.env.CI) {
    server.close()
    await stopFakeExtension()
  }
}

/* eslint-disable new-cap */
const validator = new hmacValidator()

function createNotificationPayload(
  commercetoolsProjectKey,
  adyenMerchantAccount,
  paymentKey,
  eventCode = 'AUTHORISATION',
  pspReference = 'test_AUTHORISATION_1',
  success = 'true'
) {
  const notification = {
    live: 'false',
    notificationItems: [
      {
        NotificationRequestItem: {
          additionalData: {
            'metadata.ctProjectKey': commercetoolsProjectKey,
          },
          amount: {
            currency: 'EUR',
            value: 10100,
          },
          eventCode,
          eventDate: '2019-01-30T18:16:22+01:00',
          merchantAccountCode: adyenMerchantAccount,
          merchantReference: paymentKey,
          operations: ['CANCEL', 'CAPTURE', 'REFUND'],
          paymentMethod: 'visa',
          pspReference,
          success,
        },
      },
    ],
  }
  const adyenConfig = config.getAdyenConfig(adyenMerchantAccount)
  const notificationRequestItem =
    notification.notificationItems[0].NotificationRequestItem
  if (eventCode === 'REFUND') {
    notificationRequestItem.additionalData['modification.action'] = 'refund'
  } else if (eventCode === 'CANCEL_OR_REFUND') {
    notificationRequestItem.additionalData['modification.action'] = 'cancel'
  }
  if (adyenConfig.enableHmacSignature) {
    notificationRequestItem.additionalData.hmacSignature =
      validator.calculateHmac(
        notificationRequestItem,
        adyenConfig.secretHmacKey
      )
  }

  return notification
}

function ensurePayment(
  ctpClient,
  paymentKey,
  commercetoolsProjectKey,
  adyenMerchantAccount
) {
  const paymentDraft = _.cloneDeep(payment)
  paymentDraft.key = paymentKey
  paymentDraft.custom.fields = {
    commercetoolsProjectKey,
    adyenMerchantAccount,
  }

  return ctpClient.create(ctpClient.builder.payments, paymentDraft)
}

module.exports = {
  overrideAdyenConfig,
  restoreAdyenConfig,
  buildMockErrorFromConcurrentModificaitonException,
  startIT,
  getNotificationURL,
  stopIT,
  createNotificationPayload,
  ensurePayment,
}
