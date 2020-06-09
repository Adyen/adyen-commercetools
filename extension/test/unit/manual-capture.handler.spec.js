const nock = require('nock')
const { cloneDeep } = require('lodash')
const { expect } = require('chai')
const configLoader = require('../../src/config/config')
const { execute } = require('../../src/paymentHandler/manual-capture.handler')
const { CTP_INTERACTION_TYPE_MANUAL_CAPTURE } = require('../../src/config/constants')

describe('manual-capture.handler::execute::', () => {
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
      {
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

  it('given a payment with a type "Authorised" transaction, '
    + 'when /capture" request to Adyen is issued successfully '
    + 'then it should return actions '
    + '"addInterfaceInteraction", "setCustomField" and "addTransaction"', async () => {
    const manualCaptureResponse = {
      pspReference: '883589969904820D',
      response: '[capture-received]'
    }
    scope.post('/capture').reply(200, manualCaptureResponse)

    const paymentObject = cloneDeep(authorisedPayment)
    paymentObject.custom = {
      fields: {
        manualCaptureRequest: JSON.stringify({
          modificationAmount: {
            value: 1000,
            currency: 'EUR'
          },
          originalReference: '883589969904820D',
          reference: 'YOUR_ORDER_NUMBER'
        })
      }
    }

    const { actions } = await execute(paymentObject)

    expect(actions).to.have.lengthOf(3)

    const addInterfaceInteraction = actions.find(a => a.action === 'addInterfaceInteraction')
    expect(addInterfaceInteraction.fields.type).to.equal(CTP_INTERACTION_TYPE_MANUAL_CAPTURE)
    expect(addInterfaceInteraction.fields.request).to.be.a('string')
    expect(addInterfaceInteraction.fields.response).to.equal(JSON.stringify(manualCaptureResponse))
    expect(addInterfaceInteraction.fields.createdAt).to.be.a('string')

    const setCustomField = actions.find(a => a.action === 'setCustomField')
    expect(setCustomField).to.be.deep.equal({
      action: 'setCustomField',
      name: 'manualCaptureResponse',
      value: JSON.stringify(manualCaptureResponse)
    })

    const addTransaction = actions.find(a => a.action === 'addTransaction')
    expect(addTransaction).to.be.contain({
      action: 'addTransaction',
      transaction: {
        type: 'Charge',
        state: 'Success'
      }
    })
  })
})
