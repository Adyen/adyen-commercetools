import sinon from 'sinon'
import VError from 'verror'
import { expect } from 'chai'
import lodash from 'lodash'
import config from '../../src/config/config.js'
import notificationHandler from '../../src/handler/notification/notification.handler.js'
import ctp from '../../src/utils/ctp.js'
import ctpClientMock from './ctp-client-mock.js'
import {
  overrideAdyenConfig,
  restoreAdyenConfig,
  buildMockErrorFromConcurrentModificationException,
} from '../test-utils.js'
import utils from '../../src/utils/commons.js'

const { cloneDeep } = lodash
const sandbox = sinon.createSandbox()

describe('notification module', () => {
  let paymentMock
  let notification
  let notificationsMock
  const commercetoolsProjectKey = config.getAllCtpProjectKeys()[0]
  const ctpConfig = config.getCtpConfig(commercetoolsProjectKey)
  let originalCtpGetFn

  before(async () => {
    paymentMock = await utils.readAndParseJsonFile(
      'test/resources/payment-credit-card.json',
    )
    notification = await utils.readAndParseJsonFile(
      'test/resources/notification.json',
    )
    notificationsMock = notification.notificationItems
    overrideAdyenConfig({
      enableHmacSignature: false,
    })
  })

  after(() => {
    restoreAdyenConfig()
  })

  beforeEach(async () => {
    originalCtpGetFn = await ctp.get
  })

  afterEach(() => {
    ctp.get = originalCtpGetFn
    sandbox.restore()
  })

  it(`given that ADYEN sends an "AUTHORISATION is successful" notification
      when payment has a pending authorization transaction 
      then notification module should add notification to the interface interaction 
      and should update pending authorization state to the success`, async () => {
    // prepare data
    const notifications = [
      {
        NotificationRequestItem: {
          amount: {
            currency: 'EUR',
            value: 10100,
          },
          additionalData: {
            'metadata.ctProjectKey': commercetoolsProjectKey,
          },
          eventCode: 'AUTHORISATION',
          eventDate: '2019-01-30T18:16:22+01:00',
          merchantAccountCode: 'YOUR_MERCHANT_ACCOUNT',
          merchantReference: '8313842560770001',
          operations: ['CANCEL', 'CAPTURE', 'REFUND'],
          paymentMethod: 'visa',
          pspReference: 'test_AUTHORISATION_1',
          success: 'true',
        },
      },
    ]
    const payment = cloneDeep(paymentMock)
    payment.paymentMethodInfo.method = 'scheme'
    payment.transactions.push({
      id: '9ca92d05-ba63-47dc-8f83-95b08d539646',
      type: 'Authorization',
      amount: {
        type: 'centPrecision',
        currencyCode: 'EUR',
        centAmount: 495,
        fractionDigits: 2,
      },
      interactionId: 'test_AUTHORISATION_1',
      state: 'Initial',
    })
    const ctpClient = ctpClientMock.get(ctpConfig)
    sandbox.stub(ctpClient, 'fetchByKeys').callsFake(() => ({
      body: { results: [payment] },
    }))
    const ctpClientUpdateSpy = sandbox.spy(ctpClient, 'update')
    ctp.get = () => ctpClient

    // process
    await notificationHandler.processNotification(
      notifications[0],
      false,
      config,
    )
    if (config.getModuleConfig().removeSensitiveData) {
      delete notifications[0].NotificationRequestItem.additionalData
    }
    const expectedUpdateActions = [
      {
        action: 'addInterfaceInteraction',
        type: {
          key: 'ctp-adyen-integration-interaction-notification',
          typeId: 'type',
        },
        fields: {
          status: 'authorisation',
          type: 'notification',
          notification: JSON.stringify(notifications[0]),
        },
      },
      {
        action: 'changeTransactionState',
        state: 'Success',
        transactionId: '9ca92d05-ba63-47dc-8f83-95b08d539646',
      },
      {
        action: 'changeTransactionTimestamp',
        transactionId: '9ca92d05-ba63-47dc-8f83-95b08d539646',
        timestamp: '2021-01-01T10:00:00.000Z',
      },
      {
        action: 'setKey',
        key: 'test_AUTHORISATION_1',
      },
      {
        action: 'setMethodInfoMethod',
        method: 'visa',
      },
    ]

    // assert update actions
    // createdAt is set to the current date during the update action calculation
    // We can't know what is set there
    expect(ctpClientUpdateSpy.args[0][3][0].fields.createdAt).to.exist
    const actualUpdateActionsWithoutCreatedAt = ctpClientUpdateSpy.args[0][3]
    delete actualUpdateActionsWithoutCreatedAt[0].fields.createdAt
    const actualTransactionTimestamp =
      actualUpdateActionsWithoutCreatedAt[2]?.timestamp
    expect(actualTransactionTimestamp).to.not.equal(undefined)
    expectedUpdateActions[2].timestamp = actualTransactionTimestamp
    expect(actualUpdateActionsWithoutCreatedAt).to.deep.equal(
      expectedUpdateActions,
    )
  })

  it(`given that ADYEN sends an "AUTHORISATION is not successful" notification
      when payment has a pending authorization transaction 
      then notification module should add notification to the interface interaction 
      and should not update the pending transaction `, async () => {
    // prepare data
    const notifications = [
      {
        NotificationRequestItem: {
          amount: {
            currency: 'EUR',
            value: 10100,
          },
          additionalData: {
            'metadata.ctProjectKey': commercetoolsProjectKey,
          },
          eventCode: 'AUTHORISATION',
          eventDate: '2019-01-30T18:16:22+01:00',
          merchantAccountCode: 'YOUR_MERCHANT_ACCOUNT',
          merchantReference: '8313842560770001',
          operations: ['CANCEL', 'CAPTURE', 'REFUND'],
          paymentMethod: 'visa',
          pspReference: 'test_AUTHORISATION_1',
          success: 'false',
        },
      },
    ]
    const payment = cloneDeep(paymentMock)
    payment.transactions.push({
      id: '9ca92d05-ba63-47dc-8f83-95b08d539646',
      type: 'Authorization',
      amount: {
        type: 'centPrecision',
        currencyCode: 'EUR',
        centAmount: 495,
        fractionDigits: 2,
      },
      interactionId: 'test_AUTHORISATION_1',
      state: 'Pending',
    })
    const ctpClient = ctpClientMock.get(ctpConfig)
    sandbox.stub(ctpClient, 'fetchByKeys').callsFake(() => ({
      body: { results: [payment] },
    }))
    const ctpClientUpdateSpy = sandbox.spy(ctpClient, 'update')
    ctp.get = () => ctpClient

    // process
    await notificationHandler.processNotification(
      notifications[0],
      false,
      config,
    )
    if (config.getModuleConfig().removeSensitiveData) {
      delete notifications[0].NotificationRequestItem.additionalData
    }
    const expectedUpdateActions = [
      {
        action: 'addInterfaceInteraction',
        type: {
          key: 'ctp-adyen-integration-interaction-notification',
          typeId: 'type',
        },
        fields: {
          status: 'authorisation',
          type: 'notification',
          notification: JSON.stringify(notifications[0]),
        },
      },
      {
        action: 'setKey',
        key: 'test_AUTHORISATION_1',
      },
    ]

    // assert update actions
    // createdAt is set to the current date during the update action calculation
    // We can't know what is set there
    expect(ctpClientUpdateSpy.args[0][3][0].fields.createdAt).to.exist
    const actualUpdateActionsWithoutCreatedAt = ctpClientUpdateSpy.args[0][3]
    delete actualUpdateActionsWithoutCreatedAt[0].fields.createdAt
    expect(actualUpdateActionsWithoutCreatedAt).to.deep.equal(
      expectedUpdateActions,
    )
  })

  it(`given that ADYEN sends an "AUTHORISATION is successful" notification
      when payment has a success authorization transaction 
      and has already has the same notification saved in interface interaction
      then should not update interface interaction and transaction`, async () => {
    // prepare data
    const notifications = [
      {
        NotificationRequestItem: {
          amount: {
            currency: 'EUR',
            value: 10100,
          },
          additionalData: {
            'metadata.ctProjectKey': commercetoolsProjectKey,
          },
          eventCode: 'AUTHORISATION',
          eventDate: '2019-01-30T18:16:22+01:00',
          merchantAccountCode: 'YOUR_MERCHANT_ACCOUNT',
          merchantReference: '8313842560770001',
          operations: ['CANCEL', 'CAPTURE', 'REFUND'],
          paymentMethod: 'visa',
          pspReference: 'test_AUTHORISATION_1',
          success: 'true',
        },
      },
    ]
    const payment = cloneDeep(paymentMock)
    payment.transactions.push({
      id: '9ca92d05-ba63-47dc-8f83-95b08d539646',
      type: 'Authorization',
      amount: {
        type: 'centPrecision',
        currencyCode: 'EUR',
        centAmount: 495,
        fractionDigits: 2,
      },
      interactionId: 'test_AUTHORISATION_1',
      state: 'Success',
    })
    payment.interfaceInteractions.push({
      type: {
        typeId: 'type',
        id: '3fd15a04-b460-4a88-a911-0472c4c080b3',
      },
      fields: {
        notification: JSON.stringify(notifications[0]),
        status: 'SUCCESS',
        createdAt: '2019-02-05T12:29:36.028Z',
      },
    })
    const expectedUpdateActions = [
      {
        action: 'setKey',
        key: 'test_AUTHORISATION_1',
      },
    ]
    const ctpClient = ctpClientMock.get(ctpConfig)
    sandbox.stub(ctpClient, 'fetchByKeys').callsFake(() => ({
      body: { results: [payment] },
    }))
    const ctpClientUpdateSpy = sandbox.spy(ctpClient, 'update')
    ctp.get = () => ctpClient

    // process
    await notificationHandler.processNotification(
      notifications[0],
      false,
      config,
    )
    // assert
    expect(ctpClientUpdateSpy.callCount).to.equal(1)

    const actualUpdateActionsWithoutCreatedAt = ctpClientUpdateSpy.args[0][3]

    expect(actualUpdateActionsWithoutCreatedAt).to.deep.equal(
      expectedUpdateActions,
    )
  })

  it(`given that ADYEN sends a "CANCELLATION is successful" notification
      when payment has a pending authorization transaction 
      then notification module should add notification to the interface interaction 
      and should add additional CancelAuthorization transaction`, async () => {
    // prepare data
    const notifications = [
      {
        NotificationRequestItem: {
          amount: {
            currency: 'EUR',
            value: 10100,
          },
          additionalData: {
            'metadata.ctProjectKey': commercetoolsProjectKey,
          },
          eventCode: 'CANCELLATION',
          eventDate: '2019-01-30T18:16:22+01:00',
          merchantAccountCode: 'YOUR_MERCHANT_ACCOUNT',
          merchantReference: '8313842560770001',
          operations: ['CANCEL', 'CAPTURE', 'REFUND'],
          paymentMethod: 'visa',
          pspReference: 'test_AUTHORISATION_1',
          success: 'true',
        },
      },
    ]
    const payment = cloneDeep(paymentMock)
    payment.transactions.push({
      id: '9ca92d05-ba63-47dc-8f83-95b08d539646',
      type: 'Authorization',
      amount: {
        type: 'centPrecision',
        currencyCode: 'EUR',
        centAmount: 495,
        fractionDigits: 2,
      },
      state: 'Pending',
    })
    const ctpClient = ctpClientMock.get(ctpConfig)
    sandbox.stub(ctpClient, 'fetchByKeys').callsFake(() => ({
      body: { results: [payment] },
    }))
    const ctpClientUpdateSpy = sandbox.spy(ctpClient, 'update')
    ctp.get = () => ctpClient

    // process
    await notificationHandler.processNotification(
      notifications[0],
      false,
      config,
    )
    if (config.getModuleConfig().removeSensitiveData) {
      delete notifications[0].NotificationRequestItem.additionalData
    }
    const expectedUpdateActions = [
      {
        action: 'addInterfaceInteraction',
        type: {
          key: 'ctp-adyen-integration-interaction-notification',
          typeId: 'type',
        },
        fields: {
          status: 'cancellation',
          type: 'notification',
          notification: JSON.stringify(notifications[0]),
        },
      },
      {
        action: 'addTransaction',
        transaction: {
          amount: {
            centAmount: 10100,
            currencyCode: 'EUR',
          },
          state: 'Success',
          type: 'CancelAuthorization',
          interactionId: 'test_AUTHORISATION_1',
        },
      },
      {
        action: 'setKey',
        key: 'test_AUTHORISATION_1',
      },
    ]

    // assert update actions
    // createdAt is set to the current date during the update action calculation
    // We can't know what is set there
    expect(ctpClientUpdateSpy.args[0][3][0].fields.createdAt).to.exist
    const actualUpdateActionsWithoutCreatedAt = ctpClientUpdateSpy.args[0][3]
    delete actualUpdateActionsWithoutCreatedAt[0].fields.createdAt
    const actualTransactionTimestamp =
      actualUpdateActionsWithoutCreatedAt[1]?.transaction?.timestamp
    expect(actualTransactionTimestamp).to.not.equal(undefined)
    expectedUpdateActions[1].transaction.timestamp = actualTransactionTimestamp
    expect(actualUpdateActionsWithoutCreatedAt).to.deep.equal(
      expectedUpdateActions,
    )
  })

  it(`given that ADYEN sends a "CAPTURE is successful" notification
      when payment has a successful authorization transaction 
      then notification module should add notification to the interface interaction 
      and should add a success Charge transaction`, async () => {
    // prepare data
    const notifications = [
      {
        NotificationRequestItem: {
          amount: {
            currency: 'EUR',
            value: 10100,
          },
          additionalData: {
            'metadata.ctProjectKey': commercetoolsProjectKey,
          },
          eventCode: 'CAPTURE',
          eventDate: '2019-01-30T18:16:22+01:00',
          merchantAccountCode: 'YOUR_MERCHANT_ACCOUNT',
          merchantReference: '8313842560770001',
          operations: ['CANCEL', 'CAPTURE', 'REFUND'],
          paymentMethod: 'visa',
          pspReference: 'test_AUTHORISATION_1',
          success: 'true',
        },
      },
    ]
    const payment = cloneDeep(paymentMock)
    payment.transactions.push({
      id: '9ca92d05-ba63-47dc-8f83-95b08d539646',
      type: 'Authorization',
      amount: {
        type: 'centPrecision',
        currencyCode: 'EUR',
        centAmount: 495,
        fractionDigits: 2,
      },
      state: 'Success',
    })
    const ctpClient = ctpClientMock.get(ctpConfig)
    sandbox.stub(ctpClient, 'fetchByKeys').callsFake(() => ({
      body: { results: [payment] },
    }))
    const ctpClientUpdateSpy = sandbox.spy(ctpClient, 'update')
    ctp.get = () => ctpClient

    // process
    await notificationHandler.processNotification(
      notifications[0],
      false,
      config,
    )
    if (config.getModuleConfig().removeSensitiveData) {
      delete notifications[0].NotificationRequestItem.additionalData
    }
    const expectedUpdateActions = [
      {
        action: 'addInterfaceInteraction',
        type: {
          key: 'ctp-adyen-integration-interaction-notification',
          typeId: 'type',
        },
        fields: {
          status: 'capture',
          type: 'notification',
          notification: JSON.stringify(notifications[0]),
        },
      },
      {
        action: 'addTransaction',
        transaction: {
          amount: {
            centAmount: 10100,
            currencyCode: 'EUR',
          },
          state: 'Success',
          type: 'Charge',
          interactionId: 'test_AUTHORISATION_1',
        },
      },
      {
        action: 'setKey',
        key: 'test_AUTHORISATION_1',
      },
    ]

    // assert update actions
    // createdAt is set to the current date during the update action calculation
    // We can't know what is set there
    expect(ctpClientUpdateSpy.args[0][3][0].fields.createdAt).to.exist
    const actualUpdateActionsWithoutCreatedAt = ctpClientUpdateSpy.args[0][3]
    delete actualUpdateActionsWithoutCreatedAt[0].fields.createdAt
    const actualTransactionTimestamp =
      actualUpdateActionsWithoutCreatedAt[1]?.transaction?.timestamp
    expect(actualTransactionTimestamp).to.not.equal(undefined)
    expectedUpdateActions[1].transaction.timestamp = actualTransactionTimestamp
    expect(actualUpdateActionsWithoutCreatedAt).to.deep.equal(
      expectedUpdateActions,
    )
  })

  it(`given that ADYEN sends a "CAPTURE_FAILED notification"
      when payment has a successful authorization transaction 
      then notification module should add notification to the interface interaction 
      and should add a failed Charge transaction`, async () => {
    // prepare data
    const notifications = [
      {
        NotificationRequestItem: {
          amount: {
            currency: 'EUR',
            value: 10100,
          },
          additionalData: {
            'metadata.ctProjectKey': commercetoolsProjectKey,
          },
          eventCode: 'CAPTURE_FAILED',
          eventDate: '2019-01-30T18:16:22+01:00',
          merchantAccountCode: 'YOUR_MERCHANT_ACCOUNT',
          merchantReference: '8313842560770001',
          operations: ['CANCEL', 'CAPTURE', 'REFUND'],
          paymentMethod: 'visa',
          pspReference: 'test_AUTHORISATION_1',
          success: 'true',
        },
      },
    ]
    const payment = cloneDeep(paymentMock)
    payment.transactions.push({
      id: '9ca92d05-ba63-47dc-8f83-95b08d539646',
      type: 'Authorization',
      amount: {
        type: 'centPrecision',
        currencyCode: 'EUR',
        centAmount: 495,
        fractionDigits: 2,
      },
      state: 'Success',
    })
    const ctpClient = ctpClientMock.get(ctpConfig)
    sandbox.stub(ctpClient, 'fetchByKeys').callsFake(() => ({
      body: { results: [payment] },
    }))
    const ctpClientUpdateSpy = sandbox.spy(ctpClient, 'update')
    ctp.get = () => ctpClient

    // process
    await notificationHandler.processNotification(
      notifications[0],
      false,
      config,
    )
    if (config.getModuleConfig().removeSensitiveData) {
      delete notifications[0].NotificationRequestItem.additionalData
    }
    const expectedUpdateActions = [
      {
        action: 'addInterfaceInteraction',
        type: {
          key: 'ctp-adyen-integration-interaction-notification',
          typeId: 'type',
        },
        fields: {
          status: 'capture_failed',
          type: 'notification',
          notification: JSON.stringify(notifications[0]),
        },
      },
      {
        action: 'addTransaction',
        transaction: {
          amount: {
            centAmount: 10100,
            currencyCode: 'EUR',
          },
          state: 'Failure',
          type: 'Charge',
          interactionId: 'test_AUTHORISATION_1',
          timestamp: '',
        },
      },
      {
        action: 'setKey',
        key: 'test_AUTHORISATION_1',
      },
    ]

    // assert update actions
    // createdAt is set to the current date during the update action calculation
    // We can't know what is set there
    expect(ctpClientUpdateSpy.args[0][3][0].fields.createdAt).to.exist
    const actualUpdateActionsWithoutCreatedAt = ctpClientUpdateSpy.args[0][3]
    delete actualUpdateActionsWithoutCreatedAt[0].fields.createdAt
    const actualTransactionTimestamp =
      actualUpdateActionsWithoutCreatedAt[1]?.transaction?.timestamp
    expect(actualTransactionTimestamp).to.not.equal(undefined)
    expectedUpdateActions[1].transaction.timestamp = actualTransactionTimestamp
    expect(actualUpdateActionsWithoutCreatedAt).to.deep.equal(
      expectedUpdateActions,
    )
  })

  it(`given that ADYEN sends a "CAPTURE_FAILED notification"
      when payment has a successful Charged transaction 
      then notification module should add notification to the interface interaction 
      and should update successful Charge transaction to failed Charge transaction`, async () => {
    // prepare data
    const notifications = [
      {
        NotificationRequestItem: {
          additionalData: {
            paypalErrorCode: '10606',
            paypalErrorDescription:
              'Transaction rejected, please contact the buyer.',
            'metadata.ctProjectKey': '****',
            acquirerErrorCode: '10606',
            paymentMethodVariant: 'paypal',
            acquirerErrorDescription:
              'Transaction rejected, please contact the buyer.',
            hmacSignature: '****',
          },
          amount: {
            currency: 'AUD',
            value: 72400,
          },
          eventCode: 'CAPTURE_FAILED',
          eventDate: '2022-04-13T07:17:29+02:00',
          merchantAccountCode: '****',
          merchantReference: '****',
          originalReference: '****',
          paymentMethod: 'visa',
          pspReference: 'test_AUTHORISATION_1',
          success: 'true',
        },
      },
    ]
    const payment = cloneDeep(paymentMock)
    payment.transactions.push({
      id: '9ca92d05-ba63-47dc-8f83-95b08d539646',
      type: 'Charge',
      amount: {
        type: 'centPrecision',
        currencyCode: 'EUR',
        centAmount: 55,
        fractionDigits: 2,
      },
      state: 'Success',
      interactionId: 'test_AUTHORISATION_1',
    })
    const ctpClient = ctpClientMock.get(ctpConfig)
    sandbox.stub(ctpClient, 'fetchByKeys').callsFake(() => ({
      body: { results: [payment] },
    }))
    const ctpClientUpdateSpy = sandbox.spy(ctpClient, 'update')
    ctp.get = () => ctpClient

    // process
    await notificationHandler.processNotification(
      notifications[0],
      false,
      config,
    )
    if (config.getModuleConfig().removeSensitiveData) {
      delete notifications[0].NotificationRequestItem.additionalData
    }
    const expectedUpdateActions = [
      {
        action: 'addInterfaceInteraction',
        type: {
          key: 'ctp-adyen-integration-interaction-notification',
          typeId: 'type',
        },
        fields: {
          status: 'capture_failed',
          type: 'notification',
          notification: JSON.stringify(notifications[0]),
        },
      },
      {
        action: 'changeTransactionState',
        transactionId: '9ca92d05-ba63-47dc-8f83-95b08d539646',
        state: 'Failure',
      },
      {
        action: 'changeTransactionTimestamp',
        transactionId: '9ca92d05-ba63-47dc-8f83-95b08d539646',
        timestamp: '2022-04-13T05:17:29.000Z',
      },
      {
        action: 'setKey',
        key: '****',
      },
    ]

    const actualUpdateActions = ctpClientUpdateSpy.args[0][3]
    expect(actualUpdateActions[0].fields.createdAt).to.exist
    // createdAt is set to the current date during the update action calculation
    // We can't know what is set there
    delete actualUpdateActions[0].fields.createdAt
    expect(actualUpdateActions).to.deep.equal(expectedUpdateActions)
  })

  it('should repeat on concurrent modification errors ', async () => {
    const modifiedPaymentMock = cloneDeep(paymentMock)
    modifiedPaymentMock.transactions.push({
      id: '9ca92d05-ba63-47dc-8f83-95b08d539646',
      type: 'Authorization',
      amount: {
        type: 'centPrecision',
        currencyCode: 'EUR',
        centAmount: 495,
        fractionDigits: 2,
      },
      interactionId: 'test_AUTHORISATION_1',
      state: 'Initial',
    })
    const ctpClient = ctpClientMock.get(ctpConfig)
    sandbox.stub(ctpClient, 'fetchByKeys').callsFake(() => ({
      body: { results: [modifiedPaymentMock] },
    }))
    sandbox.stub(ctpClient, 'fetchById').callsFake(() => ({
      body: modifiedPaymentMock,
    }))
    const ctpClientUpdateSpy = sandbox
      .stub(ctpClient, 'update')
      .callsFake(async () => {
        throw await buildMockErrorFromConcurrentModificationException()
      })
    ctp.get = () => ctpClient

    let err
    // process
    try {
      await notificationHandler.processNotification(
        notificationsMock[0],
        false,
        config,
      )
    } catch (e) {
      // we check retry logic here and it should throw after certain amount
      // of retries. So the error is expected
      err = e
    }
    expect(err instanceof VError).to.equal(true)
    expect(err.cause().name).to.equal('ConcurrentModification')
    expect(ctpClientUpdateSpy.callCount).to.equal(21)
  })

  it(
    'when "removeSensitiveData" is false, ' +
      'then it should not remove sensitive data',
    async () => {
      // prepare data
      const notificationDummyConfig = {
        removeSensitiveData: false,
        port: 8080,
        logLevel: 'info',
        keepAliveTimeout: 10,
      }
      sandbox.stub(config, 'getModuleConfig').returns(notificationDummyConfig)

      const notifications = [
        {
          NotificationRequestItem: {
            additionalData: {
              cvcResult: '1 Matches',
              expiryDate: '03/2030',
              authCode: '037397',
              avsResult: '5 No AVS data provided',
              cardHolderName: 'Checkout Shopper PlaceHolder',
              cardSummary: '1111',
              authorisationMid: '1000',
              'metadata.commercetoolsProjectKey': 'adyen-qa',
              hmacSignature: 'XYDnMApaCz1Mgq4oKhIg+Ew0tuZxibO2RuOxbz5asWM=',
              acquirerAccountCode: 'TestPmmAcquirerAccount',
            },
            amount: {
              currency: 'EUR',
              value: 1000,
            },
            eventCode: 'AUTHORISATION',
            eventDate: '2021-02-17T12:05:33+01:00',
            merchantAccountCode: 'Adyen-ctp-qa-01',
            merchantReference: 'test-9',
            operations: ['CANCEL', 'CAPTURE', 'REFUND'],
            paymentMethod: 'visa',
            pspReference: '862613559933189B',
            reason: '037397:1111:03/2030',
            success: 'true',
          },
        },
      ]
      const payment = cloneDeep(paymentMock)
      const ctpClient = ctpClientMock.get(ctpConfig)
      sandbox.stub(ctpClient, 'fetchByKeys').callsFake(() => ({
        body: { results: [payment] },
      }))
      const ctpClientUpdateSpy = sandbox.spy(ctpClient, 'update')
      ctp.get = () => ctpClient

      // process
      await notificationHandler.processNotification(
        notifications[0],
        false,
        config,
      )

      expect(ctpClientUpdateSpy.args[0][3][0].fields.notification).to.include(
        'additionalData',
      )
      expect(ctpClientUpdateSpy.args[0][3][0].fields.notification).to.include(
        'reason',
      )
    },
  )

  it(
    'when "removeSensitiveData" is true, ' +
      'then it should remove sensitive data',
    async () => {
      // prepare data
      const notificationDummyConfig = {
        removeSensitiveData: true,
        port: 8080,
        logLevel: 'info',
        keepAliveTimeout: 10,
      }
      sandbox.stub(config, 'getModuleConfig').returns(notificationDummyConfig)

      const notifications = [
        {
          NotificationRequestItem: {
            additionalData: {
              cvcResult: '1 Matches',
              expiryDate: '03/2030',
              authCode: '037397',
              avsResult: '5 No AVS data provided',
              cardHolderName: 'Checkout Shopper PlaceHolder',
              cardSummary: '1111',
              authorisationMid: '1000',
              'metadata.commercetoolsProjectKey': 'adyen-qa',
              hmacSignature: 'XYDnMApaCz1Mgq4oKhIg+Ew0tuZxibO2RuOxbz5asWM=',
              acquirerAccountCode: 'TestPmmAcquirerAccount',
            },
            amount: {
              currency: 'EUR',
              value: 1000,
            },
            eventCode: 'AUTHORISATION',
            eventDate: '2021-02-17T12:05:33+01:00',
            merchantAccountCode: 'Adyen-ctp-qa-01',
            merchantReference: 'test-9',
            operations: ['CANCEL', 'CAPTURE', 'REFUND'],
            paymentMethod: 'visa',
            pspReference: '862613559933189B',
            reason: '037397:1111:03/2030',
            success: 'true',
          },
        },
      ]
      const payment = cloneDeep(paymentMock)
      const ctpClient = ctpClientMock.get(ctpConfig)
      sandbox.stub(ctpClient, 'fetchByKeys').callsFake(() => ({
        body: { results: [payment] },
      }))
      const ctpClientUpdateSpy = sandbox.spy(ctpClient, 'update')
      ctp.get = () => ctpClient

      // process
      await notificationHandler.processNotification(
        notifications[0],
        false,
        config,
      )

      expect(
        ctpClientUpdateSpy.args[0][3][0].fields.notification,
      ).to.not.include('additionalData')
      expect(
        ctpClientUpdateSpy.args[0][3][0].fields.notification,
      ).to.not.include('reason')
    },
  )

  it(`given that unexpected error occurs when get payment By merchant reference
      then notification module should add notification to the interface interaction 
      and should add a success Charge transaction`, async () => {
    // prepare data
    const notifications = [
      {
        NotificationRequestItem: {
          amount: {
            currency: 'EUR',
            value: 10100,
          },
          additionalData: {
            'metadata.ctProjectKey': commercetoolsProjectKey,
          },
          eventCode: 'CAPTURE',
          eventDate: '2019-01-30T18:16:22+01:00',
          merchantAccountCode: 'YOUR_MERCHANT_ACCOUNT',
          merchantReference: '8313842560770001',
          operations: ['CANCEL', 'CAPTURE', 'REFUND'],
          paymentMethod: 'visa',
          pspReference: 'test_AUTHORISATION_1',
          success: 'true',
        },
      },
    ]
    const payment = cloneDeep(paymentMock)
    payment.transactions.push({
      id: '9ca92d05-ba63-47dc-8f83-95b08d539646',
      type: 'Authorization',
      amount: {
        type: 'centPrecision',
        currencyCode: 'EUR',
        centAmount: 495,
        fractionDigits: 2,
      },
      state: 'Success',
    })
    const ctpClient = ctpClientMock.get(ctpConfig)
    sandbox.stub(ctpClient, 'fetchByKeys').callsFake(() => {
      throw new Error('error')
    })

    ctp.get = () => ctpClient
    let error
    // process
    try {
      await notificationHandler.processNotification(
        notifications[0],
        false,
        config,
      )
    } catch (e) {
      error = e
    }
    expect(error instanceof VError).to.equal(true)
    expect(error.message).to.contains(
      'Failed to fetch a payment with merchantReference',
    )
  })
})
