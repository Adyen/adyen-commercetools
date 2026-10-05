import { expect } from 'chai'
import config from '../../src/config/config.js'
import {
  isGenericPendingNotification,
  validateBasicAuthentication,
} from '../../src/utils/basicAuthValidator.js'
import {
  overrideAdyenConfig,
  restoreAdyenConfig,
  createNotificationPayload,
  createBasicAuthHeader,
} from '../test-utils.js'

const USERNAME = 'adyen-webhook-user'
const PASSWORD = 'p4ss:w0rd:with:colons'

const NO_CREDENTIALS_CONFIGURED_MESSAGE =
  'Basic authentication is enabled but no "authentication" credentials are configured ' +
  'for the Adyen merchant account. Please update the configuration.'
const INVALID_HEADER_MESSAGE =
  'Notification does not contain a valid "Authorization" header with basic authentication credentials. ' +
  'Please check if basic authentication is configured correctly in the Adyen webhook or contact Adyen.'
const INVALID_CREDENTIALS_MESSAGE =
  'Notification does not have valid basic authentication credentials, ' +
  'please confirm that the notification was sent by Adyen ' +
  'and that the configured username and password match the Adyen webhook settings.'

describe('verify basic authentication of generic pending webhooks', () => {
  before(() => {
    overrideAdyenConfig({
      enableHmacSignature: false,
      enableBasicAuth: true,
      authentication: {
        scheme: 'basic',
        username: USERNAME,
        password: PASSWORD,
      },
    })
  })

  after(() => {
    restoreAdyenConfig()
  })

  function createPendingNotification() {
    return createNotificationPayload(
      'YOUR_PROJECT_KEY',
      'YOUR_ADYEN_ACCOUNT',
      `payment_${new Date().getTime()}`,
      `psp_${new Date().getTime()}`,
      'PENDING',
    ).notificationItems[0]
  }

  describe('isGenericPendingNotification', () => {
    it('returns true for eventCode PENDING', () => {
      expect(isGenericPendingNotification(createPendingNotification())).to.be
        .true
    })

    it('returns false for other event codes and malformed notifications', () => {
      const authorisation = createNotificationPayload(
        'YOUR_PROJECT_KEY',
        'YOUR_ADYEN_ACCOUNT',
        'payment',
        'psp',
        'AUTHORISATION',
      ).notificationItems[0]
      expect(isGenericPendingNotification(authorisation)).to.be.false
      expect(isGenericPendingNotification({})).to.be.false
      expect(isGenericPendingNotification(undefined)).to.be.false
    })
  })

  describe('validateBasicAuthentication', () => {
    it('given a valid Authorization header, then verification should pass', () => {
      const errorMessage = validateBasicAuthentication(
        createPendingNotification(),
        createBasicAuthHeader(USERNAME, PASSWORD),
      )
      expect(errorMessage).to.equal(null)
    })

    it('given the scheme in different casing and extra whitespace, then verification should pass', () => {
      const encoded = Buffer.from(`${USERNAME}:${PASSWORD}`).toString('base64')
      const errorMessage = validateBasicAuthentication(
        createPendingNotification(),
        `  BASIC   ${encoded} `,
      )
      expect(errorMessage).to.equal(null)
    })

    it('given no Authorization header, then verification should NOT pass', () => {
      expect(
        validateBasicAuthentication(createPendingNotification(), undefined),
      ).to.equal(INVALID_HEADER_MESSAGE)
      expect(
        validateBasicAuthentication(createPendingNotification(), ''),
      ).to.equal(INVALID_HEADER_MESSAGE)
    })

    it('given a malformed Authorization header, then verification should NOT pass', () => {
      const notification = createPendingNotification()
      const encoded = Buffer.from(`${USERNAME}:${PASSWORD}`).toString('base64')
      // no scheme
      expect(validateBasicAuthentication(notification, encoded)).to.equal(
        INVALID_HEADER_MESSAGE,
      )
      // wrong scheme
      expect(
        validateBasicAuthentication(notification, `Bearer ${encoded}`),
      ).to.equal(INVALID_HEADER_MESSAGE)
      // too many parts
      expect(
        validateBasicAuthentication(notification, `Basic ${encoded} extra`),
      ).to.equal(INVALID_HEADER_MESSAGE)
      // decoded value without "username:password" separator
      const noSeparator = Buffer.from('justausername').toString('base64')
      expect(
        validateBasicAuthentication(notification, `Basic ${noSeparator}`),
      ).to.equal(INVALID_HEADER_MESSAGE)
    })

    it('given a wrong username, then verification should NOT pass', () => {
      const errorMessage = validateBasicAuthentication(
        createPendingNotification(),
        createBasicAuthHeader('someone-else', PASSWORD),
      )
      expect(errorMessage).to.equal(INVALID_CREDENTIALS_MESSAGE)
    })

    it('given a wrong password, then verification should NOT pass', () => {
      const errorMessage = validateBasicAuthentication(
        createPendingNotification(),
        createBasicAuthHeader(USERNAME, 'wrong-password'),
      )
      expect(errorMessage).to.equal(INVALID_CREDENTIALS_MESSAGE)
    })

    it('given a password that is a prefix of the configured one, then verification should NOT pass', () => {
      const errorMessage = validateBasicAuthentication(
        createPendingNotification(),
        createBasicAuthHeader(USERNAME, PASSWORD.substring(0, 5)),
      )
      expect(errorMessage).to.equal(INVALID_CREDENTIALS_MESSAGE)
    })

    it('given no credentials configured for the merchant account, then verification should NOT pass', () => {
      const getAdyenConfigWithCredentials = config.getAdyenConfig
      config.getAdyenConfig = () => ({
        enableHmacSignature: false,
        enableBasicAuth: true,
      })
      try {
        const errorMessage = validateBasicAuthentication(
          createPendingNotification(),
          createBasicAuthHeader(USERNAME, PASSWORD),
        )
        expect(errorMessage).to.equal(NO_CREDENTIALS_CONFIGURED_MESSAGE)
      } finally {
        config.getAdyenConfig = getAdyenConfigWithCredentials
      }
    })
  })
})
