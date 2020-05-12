const { expect } = require('chai')
const { cloneDeep } = require('lodash')
const { address } = require('ip')
const fetch = require('node-fetch')
const ctpClientBuilder = require('../../src/utils/ctp')
const iTSetUp = require('./integration-test-set-up')
const config = require('../../src/config/config')()
const notifications = require('../resources/notification')

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

  it('should update the pending authorization transaction state to success state ' +
    'when receives a successful AUTHORIZATION notification', async () => {
    const { body: { results: [ paymentBefore ] } } = await ctpClient.fetch(ctpClient.builder.payments)
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

    const { body: { results: [ paymentAfter ] } } = await ctpClient.fetch(ctpClient.builder.payments)
    expect(paymentAfter.transactions).to.have.lengthOf(1)
    expect(paymentAfter.transactions[0].type).to.equal('Authorization')
    expect(paymentAfter.transactions[0].state).to.equal('Success')
    expect(paymentAfter.interfaceInteractions).to.have.lengthOf(1)
    const notification = notifications.notificationItems[0]
    expect(paymentAfter.interfaceInteractions[0].fields.notification).to.equal(JSON.stringify(notification))
  })

  it('should add a charge transaction when receives a successful manual CAPTURE notification', async () => {
    const { body: { results: [ paymentBefore ] } } = await ctpClient.fetch(ctpClient.builder.payments)
    expect(paymentBefore.transactions).to.have.lengthOf(1)
    expect(paymentBefore.transactions[0].type).to.equal('Authorization')
    expect(paymentBefore.transactions[0].state).to.equal('Pending')
    expect(paymentBefore.interfaceInteractions).to.have.lengthOf(0)

    //update payment transaction
    const actions = [{
      action: "changeTransactionState",
      state: "Success",
      transactionId: paymentBefore.transactions[0].id
    }]

    const { body: updatedPayment } =
      await ctpClient.update(ctpClient.builder.payments, paymentBefore.id, paymentBefore.version, actions)

    expect(updatedPayment.transactions).to.have.lengthOf(1)
    expect(updatedPayment.transactions[0].type).to.equal('Authorization')
    expect(updatedPayment.transactions[0].state).to.equal('Success')

    const modifiedNotification = cloneDeep(notifications)
    modifiedNotification.notificationItems[0].NotificationRequestItem.eventCode = 'CAPTURE'

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

    const { body: { results: [ paymentAfter ] } } = await ctpClient.fetch(ctpClient.builder.payments)
    expect(paymentAfter.transactions).to.have.lengthOf(2)
    expect(paymentAfter.transactions[0].type).to.equal('Authorization')
    expect(paymentAfter.transactions[0].state).to.equal('Success')
    expect(paymentAfter.transactions[1].type).to.equal('Charge')
    expect(paymentAfter.transactions[1].state).to.equal('Success')

    expect(paymentAfter.interfaceInteractions).to.have.lengthOf(1)
    const notification = modifiedNotification.notificationItems[0]
    expect(paymentAfter.interfaceInteractions[0].fields.notification).to.equal(JSON.stringify(notification))
  })

  it('should not update transaction when the notification event '
    + 'is not mapped to any CTP payment state', async () => {
    const { body: { results: [ paymentBefore ] } } = await ctpClient.fetch(ctpClient.builder.payments)
    expect(paymentBefore.transactions).to.have.lengthOf(1)
    expect(paymentBefore.transactions[0].type).to.equal('Authorization')
    expect(paymentBefore.transactions[0].state).to.equal('Pending')
    expect(paymentBefore.interfaceInteractions).to.have.lengthOf(0)

    const modifiedNotification = cloneDeep(notifications)
    modifiedNotification.notificationItems[0].NotificationRequestItem.eventCode = 'UNKNOWN_EVENT_CODE'
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

    const { body: { results: [ paymentAfter ] } } = await ctpClient.fetch(ctpClient.builder.payments)
    expect(paymentAfter.transactions).to.have.lengthOf(1)
    expect(paymentAfter.transactions[0].type).to.equal('Authorization')
    expect(paymentAfter.transactions[0].state).to.equal('Pending')
    expect(paymentAfter.interfaceInteractions).to.have.lengthOf(1)
    const notification = modifiedNotification.notificationItems[0]
    expect(paymentAfter.interfaceInteractions[0].fields.notification).to.equal(JSON.stringify(notification))
  })

  it('should response with success when payment does not exist on the platform', async () => {
    const { body: { results: [ paymentBefore ] } } = await ctpClient.fetch(ctpClient.builder.payments)
    expect(paymentBefore.transactions).to.have.lengthOf(1)
    expect(paymentBefore.transactions[0].type).to.equal('Authorization')
    expect(paymentBefore.transactions[0].state).to.equal('Pending')
    expect(paymentBefore.interfaceInteractions).to.have.lengthOf(0)

    const modifiedNotification = cloneDeep(notifications)
    modifiedNotification.notificationItems[0].NotificationRequestItem.merchantReference = 'NOT_EXISTING_PAYMENT'
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

    const { body: { results: [ paymentAfter ] } } = await ctpClient.fetch(ctpClient.builder.payments)
    expect(paymentAfter.transactions).to.have.lengthOf(1)
    expect(paymentAfter.transactions[0].type).to.equal('Authorization')
    expect(paymentAfter.transactions[0].state).to.equal('Pending')
    expect(paymentAfter.interfaceInteractions).to.have.lengthOf(0)
  })

  it('should udpate the pending Refund transaction state to success state ' +
    'when receives a successful CANCEL_OR_REFUND notification with refund action', async () => {
    const { body: { results: [ paymentBefore ] } } = await ctpClient.fetch(ctpClient.builder.payments)
    expect(paymentBefore.transactions).to.have.lengthOf(1)
    expect(paymentBefore.transactions[0].type).to.equal('Authorization')
    expect(paymentBefore.transactions[0].state).to.equal('Pending')
    expect(paymentBefore.interfaceInteractions).to.have.lengthOf(0)

    const actions = [
      {
        action: "changeTransactionState",
        state: "Success",
        transactionId: paymentBefore.transactions[0].id
      },
      {
        action: 'addTransaction',
        transaction: {
          type: 'Refund',
          amount: {
            currencyCode: paymentBefore.transactions[0].amount.currencyCode,
            centAmount: paymentBefore.transactions[0].amount.centAmount
          },
          state: 'Pending'
        }
      }
    ]

    const { body: updatedPayment } =
      await ctpClient.update(ctpClient.builder.payments, paymentBefore.id, paymentBefore.version, actions)

    expect(updatedPayment.transactions).to.have.lengthOf(2)
    expect(updatedPayment.transactions[0].type).to.equal('Authorization')
    expect(updatedPayment.transactions[0].state).to.equal('Success')
    expect(updatedPayment.transactions[1].type).to.equal('Refund')
    expect(updatedPayment.transactions[1].state).to.equal('Pending')

    const modifiedNotification = cloneDeep(notifications)
    modifiedNotification.notificationItems[0].NotificationRequestItem.eventCode = 'CANCEL_OR_REFUND'
    modifiedNotification.notificationItems[0].NotificationRequestItem.additionalData = {
        "modification.action": "refund"
    }

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

    const { body: { results: [ paymentAfter ] } } = await ctpClient.fetch(ctpClient.builder.payments)
    expect(paymentAfter.transactions).to.have.lengthOf(2)
    expect(paymentAfter.transactions[0].type).to.equal('Authorization')
    expect(paymentAfter.transactions[0].state).to.equal('Success')
    expect(paymentAfter.transactions[1].type).to.equal('Refund')
    expect(paymentAfter.transactions[1].state).to.equal('Success')

    expect(paymentAfter.interfaceInteractions).to.have.lengthOf(1)
    const notification = modifiedNotification.notificationItems[0]
    expect(paymentAfter.interfaceInteractions[0].fields.notification).to.equal(JSON.stringify(notification))
  })

  it('should udpate the pending CancelAuthorization transaction state to success state ' +
    'when receives a successful CANCEL_OR_REFUND notification with cancel action', async () => {
    const { body: { results: [ paymentBefore ] } } = await ctpClient.fetch(ctpClient.builder.payments)
    expect(paymentBefore.transactions).to.have.lengthOf(1)
    expect(paymentBefore.transactions[0].type).to.equal('Authorization')
    expect(paymentBefore.transactions[0].state).to.equal('Pending')
    expect(paymentBefore.interfaceInteractions).to.have.lengthOf(0)

    const actions = [
      {
        action: 'addTransaction',
        transaction: {
          type: 'CancelAuthorization',
          amount: {
            currencyCode: paymentBefore.transactions[0].amount.currencyCode,
            centAmount: paymentBefore.transactions[0].amount.centAmount
          },
          state: 'Pending'
        }
      }
    ]

    const { body: updatedPayment } =
      await ctpClient.update(ctpClient.builder.payments, paymentBefore.id, paymentBefore.version, actions)

    expect(updatedPayment.transactions).to.have.lengthOf(2)
    expect(updatedPayment.transactions[0].type).to.equal('Authorization')
    expect(updatedPayment.transactions[0].state).to.equal('Pending')
    expect(updatedPayment.transactions[1].type).to.equal('CancelAuthorization')
    expect(updatedPayment.transactions[1].state).to.equal('Pending')

    const modifiedNotification = cloneDeep(notifications)
    modifiedNotification.notificationItems[0].NotificationRequestItem.eventCode = 'CANCEL_OR_REFUND'
    modifiedNotification.notificationItems[0].NotificationRequestItem.additionalData = {
      "modification.action": "cancel"
    }

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

    const { body: { results: [ paymentAfter ] } } = await ctpClient.fetch(ctpClient.builder.payments)
    expect(paymentAfter.transactions).to.have.lengthOf(2)
    expect(paymentAfter.transactions[0].type).to.equal('Authorization')
    expect(paymentAfter.transactions[0].state).to.equal('Pending')
    expect(paymentAfter.transactions[1].type).to.equal('CancelAuthorization')
    expect(paymentAfter.transactions[1].state).to.equal('Success')

    expect(paymentAfter.interfaceInteractions).to.have.lengthOf(1)
    const notification = modifiedNotification.notificationItems[0]
    expect(paymentAfter.interfaceInteractions[0].fields.notification).to.equal(JSON.stringify(notification))
  })

  it('should not update payment ' +
    'when the notification is unauthorised', async () => {
    // enable hmac verification
    config.adyen.enableHmacSignature = true
    config.adyen.secretHmacKey = '44782DEF547AAA06C910C43932B1EB0C71FC68D9D0C057550C48EC2ACF6BA056'

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

    const { body: { results: [ paymentAfter ] } } = await ctpClient.fetch(ctpClient.builder.payments)
    expect(paymentAfter.transactions).to.have.lengthOf(1)
    expect(paymentAfter.transactions[0].type).to.equal('Authorization')
    expect(paymentAfter.transactions[0].state).to.equal('Pending')

    // make sure that the notification is not polluting interactions
    expect(paymentAfter.interfaceInteractions).to.have.lengthOf(0)
  })
})
