import { expect } from 'chai'
import nock from 'nock'
import c from '../../src/config/constants.js'
import config from '../../src/config/config.js'
import sessionRequestHandler from '../../src/paymentHandler/sessions-request.handler.js'

describe('create-session-request::execute::', () => {
  const adyenMerchantAccount = config.getAllAdyenMerchantAccounts()[0]
  const getSessionRequest = {
    countryCode: 'DE',
    reference: 'UNIQUE_PAYMENT_REFERENCE',
    amount: {
      currency: 'EUR',
      value: 1000,
    },
  }
  const paymentObject = {
    amountPlanned: {
      currencyCode: 'EUR',
      centAmount: 1000,
    },
    paymentMethodInfo: {
      paymentInterface: c.CTP_ADYEN_INTEGRATION,
    },
    interfaceInteractions: [],
    custom: {
      type: {
        typeId: 'type',
        key: c.CTP_PAYMENT_CUSTOM_TYPE_KEY,
      },
      fields: {
        commercetoolsProjectKey: 'commercetoolsProjectKey',
        createSessionRequest: JSON.stringify(getSessionRequest),
        adyenMerchantAccount,
      },
    },
  }

  const adyenCredentials = config.getAdyenConfig(
    paymentObject.custom.fields.adyenMerchantAccount,
  )

  afterEach(() => {
    nock.cleanAll()
  })

  it('handlePayment should return the right actions', async () => {
    const adyenGetSessionResponse = {
      amount: {
        currency: 'EUR',
        value: 1000,
      },
      countryCode: 'DE',
      expiresAt: '2022-12-24T13:35:16+02:00',
      id: 'CSD9CAC34EBAE225DD',
      reference: 'UNIQUE_PAYMENT_REFERENCE',
      sessionData: 'Ab02b4c...',
    }

    nock(`${adyenCredentials.apiBaseUrl}`)
      .post('/sessions')
      .query(true)
      .reply(200, adyenGetSessionResponse)

    const result = await sessionRequestHandler.execute(paymentObject)

    expect(result.actions.length).to.equal(3)
    expect(result.actions[0].action).to.equal('addInterfaceInteraction')
    expect(result.actions[1].action).to.equal('setCustomField')
    const request = JSON.parse(result.actions[0].fields.request)
    expect(JSON.parse(request.body)).to.be.deep.includes(getSessionRequest)
    expect(result.actions[0].fields.response).to.be.deep.equal(
      JSON.stringify(adyenGetSessionResponse),
    )
    expect(result.actions[0].fields.response).to.be.deep.equal(
      result.actions[1].value,
    )
    expect(result.actions[0].fields.type).to.equal(
      c.CTP_INTERACTION_TYPE_CREATE_SESSION,
    )
    expect(result.actions[1].name).to.equal(
      c.CTP_INTERACTION_TYPE_CREATE_SESSION_RESPONSE,
    )
  })

  it(
    'when adyen request fails ' +
      'then handlePayment should return the right actions with failed responses',
    async () => {
      const errorMsg = 'Unexpected exception'

      nock(`${adyenCredentials.apiBaseUrl}`)
        .post('/sessions')
        .query(true)
        .replyWithError(errorMsg)

      const result = await sessionRequestHandler.execute(paymentObject)

      expect(result.actions.length).to.equal(3)
      expect(result.actions[0].action).to.equal('addInterfaceInteraction')
      expect(result.actions[1].action).to.equal('setCustomField')
      const request = JSON.parse(result.actions[0].fields.request)
      expect(JSON.parse(request.body)).to.be.deep.includes(getSessionRequest)
      expect(result.actions[0].fields.response).to.be.includes(errorMsg)
      expect(result.actions[0].fields.type).to.equal(
        c.CTP_INTERACTION_TYPE_CREATE_SESSION,
      )
      expect(result.actions[1].name).to.equal(
        c.CTP_INTERACTION_TYPE_CREATE_SESSION_RESPONSE,
      )
    },
  )
})
