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
        interactionId: '8313547924770610',
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
          request: '{\"amount\":{\"currency\":\"EUR\",\"value\":500},\"reference\":\"YOUR_UNIQUE_REFERENCE\",\"paymentMethod\":{\"type\":\"scheme\",\"encryptedCardNumber\":\"test_4111111111111111\",\"encryptedExpiryMonth\":\"test_03\",\"encryptedExpiryYear\":\"test_2030\",\"encryptedSecurityCode\":\"test_737\"},\"returnUrl\":\"https://your-company.com/\",\"merchantAccount\":\"CommercetoolsGmbHDE775\"}',
          response: '{\"pspReference\":\"8313547924770610\",\"resultCode\":\"Authorised\",\"amount\":{\"currency\":\"EUR\",\"value\":500},\"merchantReference\":\"YOUR_UNIQUE_REFERENCE\"}',
          createdAt: '2020-06-10T12:37:00.010Z'
        }
      }
    ]
  }
  /* eslint-enable */

  const manualCaptureRequest = {
    modificationAmount: {
      value: 500,
      currency: 'EUR'
    },
    originalReference: '8313547924770610',
    reference: 'YOUR_UNIQUE_REFERENCE'
  }

  let scope
  const config = configLoader.load()
  beforeEach(() => {
    scope = nock(`${config.adyen.legacyApiBaseUrl}`)
  })

  it('given a payment '
    + 'when "/capture" request to Adyen is received successfully '
    + 'then it should return actions "addInterfaceInteraction", "setCustomField" and "addTransaction"', async () => {
    const manualCaptureResponse = {
      pspReference: '8825408195409505',
      response: '[capture-received]'
    }
    scope.post('/capture').reply(200, manualCaptureResponse)

    const paymentObject = cloneDeep(authorisedPayment)
    paymentObject.custom = {
      fields: {
        manualCaptureRequest: JSON.stringify(manualCaptureRequest)
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
    expect(addTransaction).to.be.deep.equal({
      action: 'addTransaction',
      transaction: {
        type: 'Charge',
        amount: {
          currencyCode: manualCaptureRequest.modificationAmount.currency,
          centAmount: manualCaptureRequest.modificationAmount.value
        },
        state: 'Pending',
        interactionId: manualCaptureResponse.pspReference
      }
    })
  })

  it('given a payment '
    + 'when "/capture" request to Adyen is failed '
    + 'then it should return "addInterfaceInteraction", "setCustomField" action with validation error' +
    'and should not return "addTransaction" action', async () => {
    const validationError = {
      status: 422,
      errorCode: '167',
      message: 'Original pspReference required for this operation',
      errorType: 'validation'
    }
    scope.post('/capture').reply(422, validationError)

    const paymentObject = cloneDeep(authorisedPayment)
    paymentObject.custom = {
      fields: {
        manualCaptureRequest: JSON.stringify(manualCaptureRequest)
      }
    }

    const { actions } = await execute(paymentObject)
    expect(actions).to.have.lengthOf(2)

    const addInterfaceInteraction = actions.find(a => a.action === 'addInterfaceInteraction')
    expect(addInterfaceInteraction.fields.type).to.equal(CTP_INTERACTION_TYPE_MANUAL_CAPTURE)
    expect(addInterfaceInteraction.fields.request).to.be.a('string')
    expect(addInterfaceInteraction.fields.response).to.equal(JSON.stringify(validationError))
    expect(addInterfaceInteraction.fields.createdAt).to.be.a('string')

    const setCustomField = actions.find(a => a.action === 'setCustomField')
    expect(setCustomField).to.be.deep.equal({
      action: 'setCustomField',
      name: 'manualCaptureResponse',
      value: JSON.stringify(validationError)
    })

    const addTransaction = actions.find(a => a.action === 'addTransaction')
    expect(addTransaction).to.equal(undefined)
  })
})
