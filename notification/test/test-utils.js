import _ from 'lodash'
import ip from 'ip'
import { hmacValidator } from '@adyen/api-library'
import config from '../src/config/config.js'
import { setupServer } from '../src/server.js'
import { setupNotificationResources } from '../src/setup.js'
import {
  startFakeExtension,
  stopFakeExtension,
} from './fake-extension-service.js'
import utils from '../src/utils/commons.js'

const { address } = ip

process.on('unhandledRejection', (reason) => {
  /* eslint-disable no-console */
  console.error('Unhandled Rejection:', reason)
  process.exit(1)
})

let originalGetAdyenConfigFn

function overrideAdyenConfig(newAdyenConfig) {
  originalGetAdyenConfigFn = config.getAdyenConfig
  config.getAdyenConfig = () => newAdyenConfig
}

function restoreAdyenConfig() {
  config.getAdyenConfig = originalGetAdyenConfigFn
}

async function buildMockErrorFromConcurrentModificationException() {
  const concurrentModificationError = await utils.readAndParseJsonFile(
    'test/resources/concurrent-modification-exception.json',
  )
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
  server = setupServer()
  return new Promise((resolve) => {
    server.listen(testServerPort, async () => {
      resolve()
    })
  })
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
  merchantReference,
  pspReference,
  eventCode = 'AUTHORISATION',
  success = 'true',
  originalReference,
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
          merchantReference,
          operations: ['CANCEL', 'CAPTURE', 'REFUND'],
          paymentMethod: 'visa',
          pspReference,
          originalReference,
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
        adyenConfig.secretHmacKey,
      )
  }

  return notification
}

async function ensurePayment(
  ctpClient,
  paymentKey,
  pspReference,
  commercetoolsProjectKey,
  adyenMerchantAccount,
) {
  const payment = await utils.readAndParseJsonFile(
    'test/resources/payment-draft.json',
  )
  const paymentDraft = _.cloneDeep(payment)
  paymentDraft.key = paymentKey
  paymentDraft.custom.fields.commercetoolsProjectKey = commercetoolsProjectKey
  paymentDraft.custom.fields.adyenMerchantAccount = adyenMerchantAccount
  if (pspReference) {
    paymentDraft.transactions[0].interactionId = pspReference
  }
  return ctpClient.create(ctpClient.builder.payments, paymentDraft)
}

export {
  overrideAdyenConfig,
  restoreAdyenConfig,
  buildMockErrorFromConcurrentModificationException,
  startIT,
  getNotificationURL,
  stopIT,
  createNotificationPayload,
  ensurePayment,
}
