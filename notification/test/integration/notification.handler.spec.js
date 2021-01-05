const { expect } = require('chai')
const { cloneDeep } = require('lodash')
const { address } = require('ip')
const fetch = require('node-fetch')
const ctpClientBuilder = require('../../src/utils/ctp')
const iTSetUp = require('./integration-test-set-up')
const config = require('../../src/config/config')()
const notifications = require('../resources/notification')
const notificationRefundFail = require('../resources/notification-refund-fail')

// node-fetch package doesn't support requests to localhost, therefore
// we need to provide the IP behind localhost
const localhostIp = address()

describe('notification module', () => {
  const ctpClient = ctpClientBuilder.get(config)

  before(async () => {
    await iTSetUp.startServer()
  })

  after(() => {
    iTSetUp.stopServer()
  })

  beforeEach(async () => {
    config.adyen.enableHmacSignature = false
    await iTSetUp.prepareProject(ctpClient)
  })

  afterEach(async () => {
    await iTSetUp.cleanupProject(ctpClient)
  })

  it(
    'should update the pending authorization transaction state to success state ' +
      'when receives a successful AUTHORIZATION notification',
    async () => {
      const {
        body: {
          results: [paymentBefore],
        },
      } = await ctpClient.fetch(ctpClient.builder.payments)
      expect(paymentBefore.transactions).to.have.lengthOf(1)
      expect(paymentBefore.transactions[0].type).to.equal('Authorization')
      expect(paymentBefore.transactions[0].state).to.equal('Pending')
      expect(paymentBefore.interfaceInteractions).to.have.lengthOf(0)

      // Simulating a notification from Adyen
      const response = await fetch(`http://${localhostIp}:8000`, {
        method: 'post',
        body: JSON.stringify(notifications),
        headers: { 'Content-Type': 'application/json' },
      })
      const { status } = response
      const responseBody = await response.json()

      expect(responseBody).to.deep.equal({ notificationResponse: '[accepted]' })
      expect(status).to.equal(200)

      const {
        body: {
          results: [paymentAfter],
        },
      } = await ctpClient.fetch(ctpClient.builder.payments)
      expect(paymentAfter.transactions).to.have.lengthOf(1)
      expect(paymentAfter.transactions[0].type).to.equal('Authorization')
      expect(paymentAfter.transactions[0].state).to.equal('Success')
      expect(paymentAfter.interfaceInteractions).to.have.lengthOf(1)
      const notification = notifications.notificationItems[0]
      expect(
        paymentAfter.interfaceInteractions[0].fields.notification
      ).to.equal(JSON.stringify(notification))
    }
  )

  it('should add a charge transaction when receives a successful manual CAPTURE notification', async () => {
    const {
      body: {
        results: [paymentBefore],
      },
    } = await ctpClient.fetch(ctpClient.builder.payments)
    expect(paymentBefore.transactions).to.have.lengthOf(1)
    expect(paymentBefore.transactions[0].type).to.equal('Authorization')
    expect(paymentBefore.transactions[0].state).to.equal('Pending')
    expect(paymentBefore.interfaceInteractions).to.have.lengthOf(0)

    // update payment transaction
    const actions = [
      {
        action: 'changeTransactionState',
        state: 'Success',
        transactionId: paymentBefore.transactions[0].id,
      },
    ]

    const { body: updatedPayment } = await ctpClient.update(
      ctpClient.builder.payments,
      paymentBefore.id,
      paymentBefore.version,
      actions
    )

    expect(updatedPayment.transactions).to.have.lengthOf(1)
    expect(updatedPayment.transactions[0].type).to.equal('Authorization')
    expect(updatedPayment.transactions[0].state).to.equal('Success')

    const modifiedNotification = cloneDeep(notifications)
    modifiedNotification.notificationItems[0].NotificationRequestItem.eventCode =
      'CAPTURE'
    modifiedNotification.notificationItems[0].NotificationRequestItem.pspReference = _generateRandomNumber()

    // Simulating a notification from Adyen
    const response = await fetch(`http://${localhostIp}:8000`, {
      method: 'post',
      body: JSON.stringify(modifiedNotification),
      headers: { 'Content-Type': 'application/json' },
    })
    const { status } = response
    const responseBody = await response.json()

    expect(responseBody).to.deep.equal({ notificationResponse: '[accepted]' })
    expect(status).to.equal(200)

    const {
      body: {
        results: [paymentAfter],
      },
    } = await ctpClient.fetch(ctpClient.builder.payments)
    expect(paymentAfter.transactions).to.have.lengthOf(2)
    expect(paymentAfter.transactions[0].type).to.equal('Authorization')
    expect(paymentAfter.transactions[0].state).to.equal('Success')
    expect(paymentAfter.transactions[1].type).to.equal('Charge')
    expect(paymentAfter.transactions[1].state).to.equal('Success')

    expect(paymentAfter.interfaceInteractions).to.have.lengthOf(1)
    const notification = modifiedNotification.notificationItems[0]
    expect(paymentAfter.interfaceInteractions[0].fields.notification).to.equal(
      JSON.stringify(notification)
    )
  })

  it(
    'should not update transaction when the notification event ' +
      'is not mapped to any CTP payment state',
    async () => {
      const {
        body: {
          results: [paymentBefore],
        },
      } = await ctpClient.fetch(ctpClient.builder.payments)
      expect(paymentBefore.transactions).to.have.lengthOf(1)
      expect(paymentBefore.transactions[0].type).to.equal('Authorization')
      expect(paymentBefore.transactions[0].state).to.equal('Pending')
      expect(paymentBefore.interfaceInteractions).to.have.lengthOf(0)

      const modifiedNotification = cloneDeep(notifications)
      modifiedNotification.notificationItems[0].NotificationRequestItem.eventCode =
        'UNKNOWN_EVENT_CODE'
      // Simulating a notification from Adyen
      const response = await fetch(`http://${localhostIp}:8000`, {
        method: 'post',
        body: JSON.stringify(modifiedNotification),
        headers: { 'Content-Type': 'application/json' },
      })
      const { status } = response
      const responseBody = await response.json()

      expect(responseBody).to.deep.equal({ notificationResponse: '[accepted]' })
      expect(status).to.equal(200)

      const {
        body: {
          results: [paymentAfter],
        },
      } = await ctpClient.fetch(ctpClient.builder.payments)
      expect(paymentAfter.transactions).to.have.lengthOf(1)
      expect(paymentAfter.transactions[0].type).to.equal('Authorization')
      expect(paymentAfter.transactions[0].state).to.equal('Pending')
      expect(paymentAfter.interfaceInteractions).to.have.lengthOf(1)
      const notification = modifiedNotification.notificationItems[0]
      expect(
        paymentAfter.interfaceInteractions[0].fields.notification
      ).to.equal(JSON.stringify(notification))
    }
  )

  it('should response with success when payment does not exist on the platform', async () => {
    const {
      body: {
        results: [paymentBefore],
      },
    } = await ctpClient.fetch(ctpClient.builder.payments)
    expect(paymentBefore.transactions).to.have.lengthOf(1)
    expect(paymentBefore.transactions[0].type).to.equal('Authorization')
    expect(paymentBefore.transactions[0].state).to.equal('Pending')
    expect(paymentBefore.interfaceInteractions).to.have.lengthOf(0)

    const modifiedNotification = cloneDeep(notifications)
    modifiedNotification.notificationItems[0].NotificationRequestItem.merchantReference =
      'NOT_EXISTING_PAYMENT'
    // Simulating a notification from Adyen
    const response = await fetch(`http://${localhostIp}:8000`, {
      method: 'post',
      body: JSON.stringify(modifiedNotification),
      headers: { 'Content-Type': 'application/json' },
    })
    const { status } = response
    const responseBody = await response.json()

    expect(responseBody).to.deep.equal({ notificationResponse: '[accepted]' })
    expect(status).to.equal(200)

    const {
      body: {
        results: [paymentAfter],
      },
    } = await ctpClient.fetch(ctpClient.builder.payments)
    expect(paymentAfter.transactions).to.have.lengthOf(1)
    expect(paymentAfter.transactions[0].type).to.equal('Authorization')
    expect(paymentAfter.transactions[0].state).to.equal('Pending')
    expect(paymentAfter.interfaceInteractions).to.have.lengthOf(0)
  })

  it(
    'should update the pending Refund transaction state to success state ' +
      'when receives a successful REFUND notification with refund action',
    async () => {
      const {
        body: {
          results: [paymentBefore],
        },
      } = await ctpClient.fetch(ctpClient.builder.payments)
      expect(paymentBefore.transactions).to.have.lengthOf(1)
      expect(paymentBefore.transactions[0].type).to.equal('Authorization')
      expect(paymentBefore.transactions[0].state).to.equal('Pending')
      expect(paymentBefore.interfaceInteractions).to.have.lengthOf(0)

      const refundInteractionId = _generateRandomNumber()
      const actions = [
        {
          action: 'changeTransactionState',
          state: 'Success',
          transactionId: paymentBefore.transactions[0].id,
        },
        {
          action: 'addTransaction',
          transaction: {
            type: 'Refund',
            amount: {
              currencyCode: paymentBefore.transactions[0].amount.currencyCode,
              centAmount: paymentBefore.transactions[0].amount.centAmount,
            },
            state: 'Pending',
            interactionId: refundInteractionId,
          },
        },
      ]

      const { body: updatedPayment } = await ctpClient.update(
        ctpClient.builder.payments,
        paymentBefore.id,
        paymentBefore.version,
        actions
      )

      expect(updatedPayment.transactions).to.have.lengthOf(2)
      expect(updatedPayment.transactions[0].type).to.equal('Authorization')
      expect(updatedPayment.transactions[0].state).to.equal('Success')
      expect(updatedPayment.transactions[1].type).to.equal('Refund')
      expect(updatedPayment.transactions[1].state).to.equal('Pending')

      const modifiedNotification = cloneDeep(notifications)
      modifiedNotification.notificationItems[0].NotificationRequestItem.eventCode =
        'REFUND'
      modifiedNotification.notificationItems[0].NotificationRequestItem.additionalData = {
        'modification.action': 'refund',
      }
      modifiedNotification.notificationItems[0].NotificationRequestItem.pspReference = refundInteractionId

      // Simulating a notification from Adyen
      const response = await fetch(`http://${localhostIp}:8000`, {
        method: 'post',
        body: JSON.stringify(modifiedNotification),
        headers: { 'Content-Type': 'application/json' },
      })
      const { status } = response
      const responseBody = await response.json()

      expect(responseBody).to.deep.equal({ notificationResponse: '[accepted]' })
      expect(status).to.equal(200)

      const {
        body: {
          results: [paymentAfter],
        },
      } = await ctpClient.fetch(ctpClient.builder.payments)
      expect(paymentAfter.transactions).to.have.lengthOf(2)
      expect(paymentAfter.transactions[0].type).to.equal('Authorization')
      expect(paymentAfter.transactions[0].state).to.equal('Success')
      expect(paymentAfter.transactions[1].type).to.equal('Refund')
      expect(paymentAfter.transactions[1].state).to.equal('Success')

      expect(paymentAfter.interfaceInteractions).to.have.lengthOf(1)
      const notification = modifiedNotification.notificationItems[0]
      expect(
        paymentAfter.interfaceInteractions[0].fields.notification
      ).to.equal(JSON.stringify(notification))
    }
  )

  it(
    'should update multiple pending Refund transaction states to corresponding states ' +
      'when receives multiple REFUND notifications',
    async () => {
      const {
        body: {
          results: [paymentBefore],
        },
      } = await ctpClient.fetch(ctpClient.builder.payments)
      const refundInteractionId1 = _generateRandomNumber()
      const refundInteractionId2 = _generateRandomNumber()
      const refundInteractionId3 = _generateRandomNumber()
      const actions = [
        {
          action: 'addTransaction',
          transaction: {
            type: 'Refund',
            amount: {
              currencyCode: paymentBefore.transactions[0].amount.currencyCode,
              centAmount: 50,
            },
            state: 'Pending',
            interactionId: refundInteractionId1,
          },
        },
        {
          action: 'addTransaction',
          transaction: {
            type: 'Refund',
            amount: {
              currencyCode: paymentBefore.transactions[0].amount.currencyCode,
              centAmount: 60,
            },
            state: 'Pending',
            interactionId: refundInteractionId2,
          },
        },
        {
          action: 'addTransaction',
          transaction: {
            type: 'Refund',
            amount: {
              currencyCode: paymentBefore.transactions[0].amount.currencyCode,
              centAmount: 70,
            },
            state: 'Pending',
            interactionId: refundInteractionId3,
          },
        },
      ]
      await ctpClient.update(
        ctpClient.builder.payments,
        paymentBefore.id,
        paymentBefore.version,
        actions
      )

      const successNotification1 = cloneDeep(notifications)
      successNotification1.notificationItems[0].NotificationRequestItem.eventCode =
        'REFUND'
      successNotification1.notificationItems[0].NotificationRequestItem.additionalData = {
        'modification.action': 'refund',
      }
      successNotification1.notificationItems[0].NotificationRequestItem.pspReference = refundInteractionId1

      const successNotification2 = cloneDeep(successNotification1)
      successNotification2.notificationItems[0].NotificationRequestItem.pspReference = refundInteractionId2

      const failedNotification = cloneDeep(notificationRefundFail)
      failedNotification.notificationItems[0].NotificationRequestItem.pspReference = refundInteractionId3

      // Simulating notifications from Adyen
      const responses = await Promise.all([
        fetch(`http://${localhostIp}:8000`, {
          method: 'post',
          body: JSON.stringify(successNotification1),
          headers: { 'Content-Type': 'application/json' },
        }),
        fetch(`http://${localhostIp}:8000`, {
          method: 'post',
          body: JSON.stringify(successNotification2),
          headers: { 'Content-Type': 'application/json' },
        }),
        fetch(`http://${localhostIp}:8000`, {
          method: 'post',
          body: JSON.stringify(failedNotification),
          headers: { 'Content-Type': 'application/json' },
        }),
      ])

      for (const response of responses) {
        const { status } = response
        const responseBody = await response.json()

        expect(responseBody).to.deep.equal({
          notificationResponse: '[accepted]',
        })
        expect(status).to.equal(200)
      }

      const { body: paymentAfter } = await ctpClient.fetchById(
        ctpClient.builder.payments,
        paymentBefore.id
      )
      expect(paymentAfter.transactions).to.have.lengthOf(4)
      expect(paymentAfter.transactions[1].type).to.equal('Refund')
      expect(paymentAfter.transactions[1].state).to.equal('Success')
      expect(paymentAfter.transactions[2].type).to.equal('Refund')
      expect(paymentAfter.transactions[2].state).to.equal('Success')
      expect(paymentAfter.transactions[3].type).to.equal('Refund')
      expect(paymentAfter.transactions[3].state).to.equal('Failure')
    }
  )

  it(
    'should update the pending CancelAuthorization transaction state to success state ' +
      'when receives a successful CANCEL notification with cancel action',
    async () => {
      const {
        body: {
          results: [paymentBefore],
        },
      } = await ctpClient.fetch(ctpClient.builder.payments)
      expect(paymentBefore.transactions).to.have.lengthOf(1)
      expect(paymentBefore.transactions[0].type).to.equal('Authorization')
      expect(paymentBefore.transactions[0].state).to.equal('Pending')
      expect(paymentBefore.interfaceInteractions).to.have.lengthOf(0)

      const cancellationInteractionId = _generateRandomNumber()
      const actions = [
        {
          action: 'addTransaction',
          transaction: {
            type: 'CancelAuthorization',
            amount: {
              currencyCode: paymentBefore.transactions[0].amount.currencyCode,
              centAmount: paymentBefore.transactions[0].amount.centAmount,
            },
            state: 'Pending',
            interactionId: cancellationInteractionId,
          },
        },
      ]

      const { body: updatedPayment } = await ctpClient.update(
        ctpClient.builder.payments,
        paymentBefore.id,
        paymentBefore.version,
        actions
      )

      expect(updatedPayment.transactions).to.have.lengthOf(2)
      expect(updatedPayment.transactions[0].type).to.equal('Authorization')
      expect(updatedPayment.transactions[0].state).to.equal('Pending')
      expect(updatedPayment.transactions[1].type).to.equal(
        'CancelAuthorization'
      )
      expect(updatedPayment.transactions[1].state).to.equal('Pending')

      const modifiedNotification = cloneDeep(notifications)
      modifiedNotification.notificationItems[0].NotificationRequestItem.eventCode =
        'CANCEL_OR_REFUND'
      modifiedNotification.notificationItems[0].NotificationRequestItem.additionalData = {
        'modification.action': 'cancel',
      }
      modifiedNotification.notificationItems[0].NotificationRequestItem.pspReference = cancellationInteractionId

      // Simulating a notification from Adyen
      const response = await fetch(`http://${localhostIp}:8000`, {
        method: 'post',
        body: JSON.stringify(modifiedNotification),
        headers: { 'Content-Type': 'application/json' },
      })
      const { status } = response
      const responseBody = await response.json()

      expect(responseBody).to.deep.equal({ notificationResponse: '[accepted]' })
      expect(status).to.equal(200)

      const {
        body: {
          results: [paymentAfter],
        },
      } = await ctpClient.fetch(ctpClient.builder.payments)
      expect(paymentAfter.transactions).to.have.lengthOf(2)
      expect(paymentAfter.transactions[0].type).to.equal('Authorization')
      expect(paymentAfter.transactions[0].state).to.equal('Pending')
      expect(paymentAfter.transactions[1].type).to.equal('CancelAuthorization')
      expect(paymentAfter.transactions[1].state).to.equal('Success')

      expect(paymentAfter.interfaceInteractions).to.have.lengthOf(1)
      const notification = modifiedNotification.notificationItems[0]
      expect(
        paymentAfter.interfaceInteractions[0].fields.notification
      ).to.equal(JSON.stringify(notification))
    }
  )

  it('should not update payment when the notification is unauthorised', async () => {
    // enable hmac verification
    config.adyen.enableHmacSignature = true
    config.adyen.secretHmacKey =
      '44782DEF547AAA06C910C43932B1EB0C71FC68D9D0C057550C48EC2ACF6BA056'

    const modifiedNotification = cloneDeep(notifications)

    // Simulating a modification by a middle man during transmission
    modifiedNotification.notificationItems[0].NotificationRequestItem.amount.value = 0

    // Simulating a notification from Adyen
    const response = await fetch(`http://${localhostIp}:8000`, {
      method: 'post',
      body: JSON.stringify(modifiedNotification),
      headers: { 'Content-Type': 'application/json' },
    })
    const { status } = response
    const responseBody = await response.json()

    expect(responseBody).to.deep.equal({ notificationResponse: '[accepted]' })
    expect(status).to.equal(200)

    const {
      body: {
        results: [paymentAfter],
      },
    } = await ctpClient.fetch(ctpClient.builder.payments)
    expect(paymentAfter.transactions).to.have.lengthOf(1)
    expect(paymentAfter.transactions[0].type).to.equal('Authorization')
    expect(paymentAfter.transactions[0].state).to.equal('Pending')

    // make sure that the notification is not polluting interactions
    expect(paymentAfter.interfaceInteractions).to.have.lengthOf(0)
  })

  function _generateRandomNumber() {
    return (
      new Date().getTime() + Math.floor(Math.random() * 100 + 1)
    ).toString()
  }
})
