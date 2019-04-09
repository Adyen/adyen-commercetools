const sinon = require('sinon')
const { expect } = require('chai')
const { cloneDeep } = require('lodash')
const notificationHandler = require('../../src/handler/notification/notification.handler')
const notificationsMock = require('../resources/notification').notificationItems
const concurrentModificationError = require('../resources/concurrent-modification-exception')
const ctpClientMock = require('./ctp-client-mock')
const paymentMock = require('../resources/payment-credit-card')

const sandbox = sinon.createSandbox()

const config = {
  ctp: {
    projectKey: 'test',
    clientId: 'test',
    clientSecret: 'test'
  }
}

describe('notification module', () => {
  afterEach(() => sandbox.restore())

  it('should update payment with a new InterfaceInteraction and payment status '
    + 'when current payment does not have the interfaceInteraction and the transaction'
    + 'which are going to be set', async () => {
    const ctpClient = ctpClientMock.get(config)
    sandbox.stub(ctpClient, 'fetch').callsFake(() => ({
      body: {
        results: [paymentMock]
      }
    }))
    const ctpClientUpdateSpy = sandbox.spy(ctpClient, 'update')
    await notificationHandler.processNotifications(notificationsMock, ctpClient)
    const expectedUpdateActions = [
      {
        action: 'addInterfaceInteraction',
        type: {
          key: 'ctp-adyen-integration-interaction-notification',
          typeId: 'type'
        },
        fields: {
          status: 'AUTHORISATION',
          notification: JSON.stringify(notificationsMock[0])
        }
      },
      {
        action: 'addTransaction',
        transaction: {
          type: 'Authorization',
          amount: {
            currencyCode: 'EUR',
            centAmount: 10100
          },
          state: 'Success'
        }
      }
    ]

    // Timestamp is set to the current date during the update action calculation
    // We can't know what is set there
    expect(ctpClientUpdateSpy.args[0][3][0].fields.timestamp).to.exist
    const actualUpdateActionsWithoutTimestamp = ctpClientUpdateSpy.args[0][3]
    delete actualUpdateActionsWithoutTimestamp[0].fields.timestamp
    expect(actualUpdateActionsWithoutTimestamp).to.deep.equal(expectedUpdateActions)
  })

  it('should update payment with a new InterfaceInteraction but not payment status '
    + 'when current payment does not have the interfaceInteraction which is going to be set'
    + 'but has a transaction with the correct status', async () => {
    const modifiedPaymentMock = cloneDeep(paymentMock)
    modifiedPaymentMock.transactions.push({
      type: 'Authorization',
      amount: {
        type: 'centPrecision',
        currencyCode: 'EUR',
        centAmount: 495,
        fractionDigits: 2
      },
      state: 'Success'
    })
    const ctpClient = ctpClientMock.get(config)
    sandbox.stub(ctpClient, 'fetch').callsFake(() => ({
      body: {
        results: [modifiedPaymentMock]
      }
    }))
    const ctpClientUpdateSpy = sandbox.spy(ctpClient, 'update')
    await notificationHandler.processNotifications(notificationsMock, ctpClient)
    const expectedUpdateActions = [
      {
        action: 'addInterfaceInteraction',
        type: {
          key: 'ctp-adyen-integration-interaction-notification',
          typeId: 'type'
        },
        fields: {
          status: 'AUTHORISATION',
          notification: JSON.stringify(notificationsMock[0])
        }
      }
    ]

    // Timestamp is set to the current date during the update action calculation
    // We can't know what is set there
    expect(ctpClientUpdateSpy.args[0][3][0].fields.timestamp).to.exist
    const actualUpdateActionsWithoutTimestamp = ctpClientUpdateSpy.args[0][3]
    delete actualUpdateActionsWithoutTimestamp[0].fields.timestamp
    expect(actualUpdateActionsWithoutTimestamp).to.deep.equal(expectedUpdateActions)
  })

  it('should update payment with a payment status but not new InterfaceInteraction '
    + 'when current payment does not have the transaction which is going to be set'
    + 'but has the interfaceInteraction', async () => {
    const modifiedPaymentMock = cloneDeep(paymentMock)
    modifiedPaymentMock.interfaceInteractions.push({
      type: {
        typeId: 'type',
        id: '3fd15a04-b460-4a88-a911-0472c4c080b3'
      },
      fields: {
        notification: JSON.stringify(notificationsMock[0]),
        status: 'SUCCESS',
        timestamp: '2019-02-05T12:29:36.028Z'
      }
    })
    const ctpClient = ctpClientMock.get(config)
    sandbox.stub(ctpClient, 'fetch').callsFake(() => ({
      body: {
        results: [modifiedPaymentMock]
      }
    }))
    const ctpClientUpdateSpy = sandbox.spy(ctpClient, 'update')
    await notificationHandler.processNotifications(notificationsMock, ctpClient)
    const expectedUpdateActions = [
      {
        action: 'addTransaction',
        transaction: {
          type: 'Authorization',
          amount: {
            currencyCode: 'EUR',
            centAmount: 10100
          },
          state: 'Success'
        }
      }
    ]

    expect(ctpClientUpdateSpy.args[0][3]).to.deep.equal(expectedUpdateActions)
  })

  it('should update transaction with a new state', async () => {
    const modifiedPaymentMock = cloneDeep(paymentMock)
    const notificationsMockClone = cloneDeep(notificationsMock)
    notificationsMockClone[0].NotificationRequestItem.eventCode = 'CAPTURE'
    notificationsMockClone[0].NotificationRequestItem.success = 'false'
    modifiedPaymentMock.interfaceInteractions.push({
      type: {
        typeId: 'type',
        id: '3fd15a04-b460-4a88-a911-0472c4c080b3'
      },
      fields: {
        timestamp: '2019-02-05T12:29:36.028Z',
        notification: JSON.stringify(notificationsMockClone[0]),
        status: 'SUCCESS'
      }
    })
    const ctpClient = ctpClientMock.get(config)
    sandbox.stub(ctpClient, 'fetch').callsFake(() => ({
      body: {
        results: [modifiedPaymentMock]
      }
    }))
    const ctpClientUpdateSpy = sandbox.spy(ctpClient, 'update')


    await notificationHandler.processNotifications(notificationsMockClone, ctpClient)
    const expectedUpdateActions = [
      {
        action: 'changeTransactionState',
        state: 'Success',
        transactionId: '9ca92d05-ba63-47dc-8f83-95b08d539646'
      }
    ]

    expect(ctpClientUpdateSpy.args[0][3]).to.deep.equal(expectedUpdateActions)
  })

  it('should repeat on concurrent modification errors ', async () => {
    const modifiedPaymentMock = cloneDeep(paymentMock)
    modifiedPaymentMock.interfaceInteractions.push({
      type: {
        typeId: 'type',
        id: '3fd15a04-b460-4a88-a911-0472c4c080b3'
      },
      fields: {
        timestamp: '2019-02-05T12:29:36.028Z',
        notification: JSON.stringify(notificationsMock[0]),
        status: 'SUCCESS'
      }
    })
    const ctpClient = ctpClientMock.get(config)
    sandbox.stub(ctpClient, 'fetch').callsFake(() => ({
      body: {
        results: [modifiedPaymentMock]
      }
    }))
    sandbox.stub(ctpClient, 'fetchById').callsFake(() => ({
      body: {
        results: [modifiedPaymentMock]
      }
    }))
    const ctpClientUpdateSpy = sandbox.stub(ctpClient, 'update').callsFake(() => {
      throw concurrentModificationError
    })
    try {
      await notificationHandler.processNotifications(notificationsMock, ctpClient)
      // eslint-disable-next-line no-empty
    } catch (e) {
    }
    expect(ctpClientUpdateSpy.callCount).to.equal(21)
  })

  it('do not make any requests when merchantReference cannot be extracted from notification', async () => {
    const ctpClient = ctpClientMock.get(config)
    const ctpClientFetchSpy = sandbox.spy(ctpClient, 'fetch')
    const ctpClientFetchByIdSpy = sandbox.spy(ctpClient, 'fetchById')
    const ctpClientUpdateSpy = sandbox.spy(ctpClient, 'update')
    await notificationHandler.processNotifications([{ name: 'some wrong notification' }], ctpClient)

    expect(ctpClientFetchSpy.callCount).to.equal(0)
    expect(ctpClientFetchByIdSpy.callCount).to.equal(0)
    expect(ctpClientUpdateSpy.callCount).to.equal(0)
  })
})
