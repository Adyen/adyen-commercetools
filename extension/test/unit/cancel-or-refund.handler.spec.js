const { cloneDeep } = require('lodash')
const nock = require('nock')
const { expect } = require('chai')
const configLoader = require('../../src/config/config')
const { CTP_INTERACTION_TYPE_CANCEL_OR_REFUND } = require('../../src/config/constants')
const { execute } = require('../../src/paymentHandler/cancel-or-refund.handler')

describe('cancel-or-refund.handler::execute::', () => {
  const cancelOrRefundResponse = {
    pspReference: '853589969905798D',
    response: '[cancelOrRefund-received]'
  }
  /* eslint-disable*/
  const authorisedPayment = {
    transactions: [
      {
        id: 'transaction1',
        type: 'Authorization',
        interactionId: '883589969904820D',
        state: 'Success'
      }
    ],
    interfaceInteractions: [
      { // old payment interaction
        type: {
          typeId: 'type',
        },
        fields: {
          type: 'makePayment',
          request: 'request',
          response: 'failed',
          createdAt: '2020-04-20T10:18:25.073Z'
        }
      },
      { // latest payment interaction
        type: {
          typeId: 'type',
        },
        fields: {
          type: 'makePayment',
          request: '{\"amount\":{\"currency\":\"EUR\",\"value\":1000},\"reference\":\"YOUR_ORDER_NUMBER\",\"paymentMethod\":{\"type\":\"scheme\",\"encryptedCardNumber\":\"test_4111111111111111\",\"encryptedExpiryMonth\":\"test_03\",\"encryptedExpiryYear\":\"test_2030\",\"encryptedSecurityCode\":\"test_737\"},\"returnUrl\":\"https://your-company.com/\",\"merchantAccount\":\"CommercetoolsGmbHDE775\"}',
          response: '{\"pspReference\":\"883589969904820D\",\"resultCode\":\"Authorised\",\"amount\":{\"currency\":\"EUR\",\"value\":1000},\"merchantReference\":\"YOUR_ORDER_NUMBER\"}',
          createdAt: '2020-05-20T10:18:25.073Z'
        }
      }
    ]
  }
  /* eslint-enable */

  let scope
  const config = configLoader.load()
  beforeEach(() => {
    scope = nock(`${config.adyen.legacyApiBaseUrl}`)
  })

  it('given a payment with a type "Refund" transaction, '
    + 'when /cancelOrRefund" request to Adyen is issued successfully '
    + 'then it should return actions '
    + '"addInterfaceInteraction", "changeTransactionState" and "changeTransactionInteractionId"', async () => {
    scope.post('/cancelOrRefund').reply(200, cancelOrRefundResponse)

    const paymentObject = cloneDeep(authorisedPayment)
    paymentObject.transactions.push({
      id: 'transaction2',
      type: 'Refund',
      state: 'Initial'
    })

    const response = await execute(paymentObject)
    assertUpdateActions(response)
  })

  it('given a payment with a type "CancelAuthorization" transaction, '
    + 'when /cancelOrRefund" request to Adyen is issued successfully '
    + 'then it should return actions '
    + '"addInterfaceInteraction", "changeTransactionState" and "changeTransactionInteractionId"', async () => {
    scope.post('/cancelOrRefund').reply(200, cancelOrRefundResponse)

    const paymentObject = cloneDeep(authorisedPayment)
    paymentObject.transactions.push({
      id: 'transaction2',
      type: 'CancelAuthorization',
      state: 'Initial'
    })

    const response = await execute(paymentObject)
    assertUpdateActions(response)
  })

  it('given a payment with invalid pspReference'
    + 'when /cancelOrRefund" request to Adyen is not accepted'
    + 'then it should only return action "addInterfaceInteraction"', async () => {
    const error = {
      status: 422,
      errorCode: '167',
      message: 'Original pspReference required for this operation',
      errorType: 'validation'
    }
    scope.post('/cancelOrRefund').reply(422, error)
    const { actions } = await execute(authorisedPayment)

    expect(actions).to.have.lengthOf(1)

    expect(actions[0].fields.type).to.equal(CTP_INTERACTION_TYPE_CANCEL_OR_REFUND)
    expect(actions[0].fields.request).to.be.a('string')
    expect(actions[0].fields.response).to.equal(JSON.stringify(error))
    expect(actions[0].fields.createdAt).to.be.a('string')
  })

  function assertUpdateActions ({ actions }) {
    expect(actions).to.have.lengthOf(3)

    const addInterfaceInteraction = actions.find(a => a.action === 'addInterfaceInteraction')
    expect(addInterfaceInteraction.fields.type).to.equal(CTP_INTERACTION_TYPE_CANCEL_OR_REFUND)
    expect(addInterfaceInteraction.fields.request).to.be.a('string')
    expect(addInterfaceInteraction.fields.response).to.equal(JSON.stringify(cancelOrRefundResponse))
    expect(addInterfaceInteraction.fields.createdAt).to.be.a('string')

    const changeTransactionState = actions.find(a => a.action === 'changeTransactionState')
    expect(changeTransactionState).to.be.deep.equal({
      action: 'changeTransactionState',
      transactionId: 'transaction2',
      state: 'Pending'
    })

    const changeTransactionInteractionId = actions.find(a => a.action === 'changeTransactionInteractionId')
    expect(changeTransactionInteractionId).to.be.deep.equal({
      action: 'changeTransactionInteractionId',
      transactionId: 'transaction2',
      interactionId: '853589969905798D'
    })
  }
})
