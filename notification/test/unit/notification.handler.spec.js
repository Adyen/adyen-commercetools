const sinon = require('sinon')
const { expect } = require('chai')
const { cloneDeep } = require('lodash')
const logger = require('../../src/utils/logger').getLogger()
const notificationHandler = require('../../src/handler/notification/notification.handler')
const notificationsMock = require('../resources/notification').notificationItems
const ctpClientMock = require('./ctpClientMock')
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

  it('should update payment with a new InterfaceInteraction and payment status', async () => {

    const ctpClient = ctpClientMock.get(config)
    sandbox.stub(ctpClient, 'fetch').callsFake(() => {
      return {
        body: {
          results: [paymentMock]
        }
      }
    })
    const ctpClientUpdateSpy = sandbox.spy(ctpClient, 'update')
    await notificationHandler.processNotifications(notificationsMock, logger, ctpClient)
    const expectedUpdateActions = [
      {
        action: 'addInterfaceInteraction',
        type: {
          key: 'ctp-adyen-integration-interaction-response',
          typeId: 'type'
        },
        fields: {
          status: 'AUTHORISATION',
          type: 'notification',
          response: JSON.stringify(notificationsMock[0])
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

    expect(ctpClientUpdateSpy.args[0][3]).to.deep.equal(expectedUpdateActions)
  })

  it('should update payment with a new InterfaceInteraction but not payment status', async () => {
    const modifiedPaymentMock = cloneDeep(paymentMock)
    modifiedPaymentMock.transactions.push({
      "type": "Authorization",
      "amount": {
        "type": "centPrecision",
        "currencyCode": "EUR",
        "centAmount": 495,
        "fractionDigits": 2
      },
      "state": "Success"
    })
    const ctpClient = ctpClientMock.get(config)
    sandbox.stub(ctpClient, 'fetch').callsFake(() => {
      return {
        body: {
          results: [modifiedPaymentMock]
        }
      }
    })
    const ctpClientUpdateSpy = sandbox.spy(ctpClient, 'update')
    await notificationHandler.processNotifications(notificationsMock, logger, ctpClient)
    const expectedUpdateActions = [
      {
        action: 'addInterfaceInteraction',
        type: {
          key: 'ctp-adyen-integration-interaction-response',
          typeId: 'type'
        },
        fields: {
          status: 'AUTHORISATION',
          type: 'notification',
          response: JSON.stringify(notificationsMock[0])
        }
      }
    ]

    expect(ctpClientUpdateSpy.args[0][3]).to.deep.equal(expectedUpdateActions)
  })

  it('should update payment with a payment status but not InterfaceInteraction', async () => {
    const modifiedPaymentMock = cloneDeep(paymentMock)
    modifiedPaymentMock.interfaceInteractions.push({
      "type": "Authorization",
      "amount": {
        "type": "centPrecision",
        "currencyCode": "EUR",
        "centAmount": 495,
        "fractionDigits": 2
      },
      "state": "Success"
    })
    const ctpClient = ctpClientMock.get(config)
    sandbox.stub(ctpClient, 'fetch').callsFake(() => {
      return {
        body: {
          results: [modifiedPaymentMock]
        }
      }
    })
    const ctpClientUpdateSpy = sandbox.spy(ctpClient, 'update')
    await notificationHandler.processNotifications(notificationsMock, logger, ctpClient)
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
})
