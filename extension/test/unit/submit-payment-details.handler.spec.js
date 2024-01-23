import nock from 'nock'
import _ from 'lodash'
import { expect } from 'chai'
import sinon from 'sinon'
import submitPaymentDetailsSuccessResponse from './fixtures/adyen-submit-payment-details-success-response.js'
import submitPaymentDetailsChallengeRes from './fixtures/adyen-submit-payment-details-challenge-shopper-response.js'
import makePaymentRedirectResponse from './fixtures/adyen-make-payment-3ds-redirect-response.js'
import paymentDetailsHandler from '../../src/paymentHandler/submit-payment-details.handler.js'
import config from '../../src/config/config.js'
import c from '../../src/config/constants.js'
import utils from '../../src/utils.js'

const { execute } = paymentDetailsHandler

describe('submit-additional-payment-details::execute', () => {
  let ctpPayment
  let scope
  /* eslint-disable max-len */
  const submitPaymentDetailsRequest = {
    details: {
      MD: 'M2RzMi40YTdmZGFjNTIzMzQyNDllNWY1YmQyMWQ5OGZlMGI0YjRiYzViNjkyYmEzODZiNDE0NmE5YjgzYTMzNjQwODFh',
      PaRes:
        'BQABAgAl9h9S78IkDwV92Fa_O3ZdxU3sHIIa23Z0MT20jM5P74jtujtyy_dMqUL5IPiF_wb1tMvWJago_mdKRL6vQkBxxzg51N9M57akADykaDEm3NXLAPRWu7BIopC8zePXHxVte7Ui966ghJ5XFIZ_FfLaji1E_KFzzMqOOp72NxlTQGCwF8Usx2lCBvzfVhINGwuzu2pnjzxZatquaISb1epY82jrcDNAjL9JqkgJV_hodMkx0sRoVKqnjqsUiaVH0Gj3ppojuHrRNXmK0b4w2wYhlwRpczmNxN8UrMTXHX3lrROQXAq78d3xBMDmoV61H6KNPrFjFoAtcdz0dWMMk97JdtuWyBzqJ5kkCX1G2VrzXm4CnBNwogZrVvsd_KBssVgEmd4uNcYYYheSFA64FqTKL1_OEvnz6iOJ3lGdmE3UFA2rtQ7h16VUGXX9V0vUeibJXW1yAUP1GCjNnVNbdX9vTYfZubZ28pZZD09qkcnkPmnrgc9ElC2dwa1R2mOwYePco9OUH7YN0jBPt9Mp_l_5f4imIalclKtLya-VFmbbn0NFOY8UAsotl3Vs3otZa1tWxQ4Qkf9u7SG_biQORIUltlCgwCJG9ZAC6qSZgV1IOU9KB2uDPlF2MxFINYYJGtar4aSADc7lJtD-6aGz2Iev068snyqAkyvejzJUPuCsoBBV7DTmTcao_YSOzGKHhd3AAEp7ImtleSI6IkFGMEFBQTEwM0NBNTM3RUFFRDg3QzI0REQ1MzkwOUI4MEE3OEE5MjNFMzgyM0Q2OERBQ0M5NEI5RkY4MzA1REMiferf2airaRV3vVaz6LGdyZzAUFUTMy1y3rxMZfNiLU4b2QFrRmbamSpQ5d6KU43eBFnCBOUpEmX956Jv5dFWEfbQ8aiAN_rTLjIuBQABAQBeihZONltVS1RSkIq15Ncaf0TJP_RUw_nS4u2B48E7RdTAp8Fha3zkO5pVQtcOxmNEnD6MgSrt-8S9ctb52NzzpGkUuI372lqiQ4D0MCn49uuT8RZ2sl9ommdChKCfjuPsPnMMxUQGITmOPNUliE8BX280OeNQ4DHw6rV7Qv4al1KXw1c2DwETC-bxKRKsG7U22j5qA1JcraRhCFGZ0q43_6HZbWaa6-A_2PQlwFVL_8ywbjnR7orHJo91SWbDaFL99hnnGwHOFXdOeOaRgfgJsMoDssDaCLvba4XFOpF0crgj8-BMeto6wIYsB_e2E36UMMCg3U7ZR7L64m37v09JEAeTzYHTOwPrJTKuHNoZlYAAANyzlMKxcO1IcS5Eg7p7MRY4OPS88PlW2MWHK31YErfu2KQChEmJV16-zuQuT871Sq0VDirRXBCQ881TUlFd584SvO3PGSoAoibAAW73Anc7NvWlRe1bOoPgyA55uTD6FvElntRPFEg4w9Wc_8BU6y5PQ2nrqQmKroLRYjfxR2RT3xAjyV5gg0lEHt-WAqx30BXMFJct2hufvaliS5yEqZ6X4YjbGNT_UHUTu2QlnjOwik98E-HaZcctB7U4eARLCUDnFsK7KVoixdeXOmYwEZRXyfgNdW97PEvVvZNqFVcMlxSQo7-taaJwaOCUtTj__ynIfCsmonjWXNC_sIELyGSOEScxbSO8p8QXPVlrEbh58APJykjEncC9nSBj4nOWagN61cCBCfG_jGsPULkGmkLh-vXCee0PX_juY6bhw5-pZ7Juz-q8nGHYN5YML4txMHqTHb46O7HXZ3_QpZxEfvptp_HYcWotnSdnpjLQW-aF3V3IuaNNJIWWXGSZeeuAfnuBQMzbxFzfkJthUeQytt-TJXjrybTmzr_BpTT-6u9w3At4EnNcxUIYkgtwYvUerc0foK6rVjWqWJXMlv_zSjVzhbtXBMnACQEtbU6jlp0TRM8xgd-_XCwVjYHX9o7CXEqB_kx2IVPlAW5T2UR9U6ZKOctxJ_m7p46CZONpj29lGzDIWwp6syvKUazOmzPo9-VHaG0zoCv62824prcEQRM779jiU2k0zDnf7VNBjoode8o9Af_RBeEST02El5G_9J5cVrBPRNRNS9o1mxBPJO--KlBkg_FbwEq7M1y5MIHacqtBZN3UGq2esEB7xh3FJWiwL5O0XxLn41CI0FiQ0csXdzUaLOU96my467gNEZGk00p_B9Dl-3a8Gm6fIR5OEQNpeh7FBWMGF5UoBG20pyXvn8nJhnGmSMB4ARh8PWCEZCeEMwAAnTTy0aXTg8uJBc6u8pcbB4fOhj92mXyudgMJnxwHnIC3qMGbOvBJs3HTGakUObChVbzaAH27R9rVBtHhmr2P1BZNF68dnlNTuLil3_PlhlJuNwQepxooyGuTZMqPUx9Vu7ufLoOKEo9gtY4b_hmqSKuVNbENeHNxPhwdwg-ifGJSjqfxAot9X4S8NvJv3AQEJn5xha_grAh7Pu6T4I0AF_EuS6o14Wm1hZ4dobkABgfDXpXKvB98wr9HL8W23wkiAImMvLgefd5OmnO0P4vS7hf0vyOzwpfrgMcHG4QrBI2U2DRRJmIqPFICTuwNPXX3nQ3l1YfhtGIzmToW6EXVdnkGXvIjHmfbgF0XCcCP5M2YTf-89HJ6fV81vFRnd74gB-fjQ42_14JvnaOIbAIKehw1oe-QdSgfjuz9bp_zzzytF1xD4al4m1yeZ6ObKF-v_7L0yYnWfjZwcQZGJqWhQLOOtnv8D9sDjX2HwLi_A36WaqvyNFk3DKTt35le2fOgCXT9o_k3p-olYkyOVSRTfIWhdVth5iKYxmF6aKzSZByrFnMbVlFuwh1bTW9p12g258MQ3nWe4OvpMRzP5ymRnsjPk0enmVJf-ynrFcjzUmMXZlT-6kv5zDdyFVwBRwVyK2ro_uJ2wf9VqvGmjxhwPe33kYnqcb58_AnNyMR7tZVSIlTV3JdImAh9zk0HTzWw1nkRpYakYz79U0o6tZIsTL5q1VxvUk5N2bQB9tMyxw9gpxC1rzlTQWKHh4qRFfFztIE3OEA1jjnz2GUCPg4Omu9lAUZqjTnIjBavNsoa2zAxk4WaPPWbulChMXPN5k08DYKqJno5to6FU79CDhbPyDC2FD49bxjm_Z_zG2my5hzNVWoN_bM',
    },
  }
  /* eslint-enable max-len */
  const adyenMerchantAccount = config.getAllAdyenMerchantAccounts()[0]

  before(async () => {
    ctpPayment = await utils.readAndParseJsonFile(
      'test/unit/fixtures/ctp-payment-make-payment.json',
    )
  })

  beforeEach(() => {
    const adyenConfig = config.getAdyenConfig(adyenMerchantAccount)
    scope = nock(`${adyenConfig.apiBaseUrl}`)
  })

  afterEach(() => {
    nock.cleanAll()
  })

  it(
    'when resultCode from Adyen is "Authorized", ' +
      'then it should return actions "addTransaction", "addInterfaceInteraction" and "setCustomField"',
    async () => {
      scope
        .post('/payments/details')
        .reply(200, submitPaymentDetailsSuccessResponse)

      const ctpPaymentClone = _.cloneDeep(ctpPayment)
      ctpPaymentClone.custom.fields.submitAdditionalPaymentDetailsRequest =
        JSON.stringify(submitPaymentDetailsRequest)
      ctpPaymentClone.custom.fields.makePaymentResponse = JSON.stringify(
        makePaymentRedirectResponse,
      )
      ctpPaymentClone.custom.fields.adyenMerchantAccount = adyenMerchantAccount

      const response = await execute(ctpPaymentClone)

      expect(response.actions).to.have.lengthOf(4)
      const addInterfaceInteraction = response.actions.find(
        (a) => a.action === 'addInterfaceInteraction',
      )
      expect(addInterfaceInteraction.fields.type).to.equal(
        c.CTP_INTERACTION_TYPE_SUBMIT_ADDITIONAL_PAYMENT_DETAILS,
      )
      expect(addInterfaceInteraction.fields.request).to.be.a('string')
      expect(addInterfaceInteraction.fields.response).to.be.a('string')
      expect(addInterfaceInteraction.fields.createdAt).to.be.a('string')

      const request = JSON.parse(addInterfaceInteraction.fields.request)
      const requestBody = JSON.parse(request.body)
      expect(requestBody.reference).to.deep.equal(
        submitPaymentDetailsRequest.reference,
      )
      expect(requestBody.riskData).to.deep.equal(
        submitPaymentDetailsRequest.riskData,
      )
      expect(requestBody.paymentMethod).to.deep.equal(
        submitPaymentDetailsRequest.paymentMethod,
      )
      expect(requestBody.browserInfo).to.deep.equal(
        submitPaymentDetailsRequest.browserInfo,
      )
      expect(requestBody.amount).to.deep.equal(
        submitPaymentDetailsRequest.amount,
      )
      expect(requestBody.merchantAccount).to.equal(adyenMerchantAccount)

      const setCustomFieldAction = response.actions.find(
        (a) => a.action === 'setCustomField',
      )
      expect(setCustomFieldAction.name).to.equal(
        c.CTP_CUSTOM_FIELD_SUBMIT_ADDITIONAL_PAYMENT_DETAILS_RESPONSE,
      )
      expect(setCustomFieldAction.value).to.be.a('string')
      const expectedCustomFieldValue = JSON.parse(
        _.cloneDeep(submitPaymentDetailsSuccessResponse),
      )
      delete expectedCustomFieldValue.additionalData
      expect(setCustomFieldAction.value).to.equal(
        JSON.stringify(expectedCustomFieldValue),
      )
      expect(setCustomFieldAction.value).to.equal(
        addInterfaceInteraction.fields.response,
      )

      const addTransaction = response.actions.find(
        (a) => a.action === 'addTransaction',
      )
      expect(addTransaction.transaction).to.be.a('object')
      expect(addTransaction.transaction.type).to.equal('Authorization')
      expect(addTransaction.transaction.state).to.equal('Success')
      expect(addTransaction.transaction.interactionId).to.equal(
        JSON.parse(submitPaymentDetailsSuccessResponse).pspReference,
      )
      const setKeyAction = response.actions.find((a) => a.action === 'setKey')
      expect(setKeyAction.key).to.equal(
        JSON.parse(submitPaymentDetailsSuccessResponse).pspReference,
      )
    },
  )

  it(
    'when resultCode from Adyen is "ChallengeShopper", ' +
      'then it should return actions "addInterfaceInteraction" and "setCustomField"',
    async () => {
      scope
        .post('/payments/details')
        .reply(200, submitPaymentDetailsChallengeRes)

      const ctpPaymentClone = _.cloneDeep(ctpPayment)
      ctpPaymentClone.custom.fields.submitAdditionalPaymentDetailsRequest =
        JSON.stringify(submitPaymentDetailsRequest)
      ctpPaymentClone.custom.fields.makePaymentResponse = JSON.stringify(
        makePaymentRedirectResponse,
      )
      ctpPaymentClone.custom.fields.adyenMerchantAccount = adyenMerchantAccount

      const response = await execute(ctpPaymentClone)

      expect(response.actions).to.have.lengthOf(2)

      const addInterfaceInteraction = response.actions.find(
        (a) => a.action === 'addInterfaceInteraction',
      )
      expect(addInterfaceInteraction.fields.type).to.equal(
        c.CTP_INTERACTION_TYPE_SUBMIT_ADDITIONAL_PAYMENT_DETAILS,
      )
      expect(addInterfaceInteraction.fields.request).to.be.a('string')
      expect(addInterfaceInteraction.fields.response).to.be.a('string')
      expect(addInterfaceInteraction.fields.createdAt).to.be.a('string')

      const request = JSON.parse(addInterfaceInteraction.fields.request)
      const requestBody = JSON.parse(request.body)
      expect(requestBody.reference).to.deep.equal(
        submitPaymentDetailsRequest.reference,
      )
      expect(requestBody.riskData).to.deep.equal(
        submitPaymentDetailsRequest.riskData,
      )
      expect(requestBody.paymentMethod).to.deep.equal(
        submitPaymentDetailsRequest.paymentMethod,
      )
      expect(requestBody.browserInfo).to.deep.equal(
        submitPaymentDetailsRequest.browserInfo,
      )
      expect(requestBody.amount).to.deep.equal(
        submitPaymentDetailsRequest.amount,
      )
      expect(requestBody.merchantAccount).to.equal(adyenMerchantAccount)

      const setCustomFieldAction = response.actions.find(
        (a) => a.action === 'setCustomField',
      )
      expect(setCustomFieldAction.name).to.equal(
        c.CTP_CUSTOM_FIELD_SUBMIT_ADDITIONAL_PAYMENT_DETAILS_RESPONSE,
      )
      expect(setCustomFieldAction.value).to.be.a('string')
      expect(setCustomFieldAction.value).to.equal(
        submitPaymentDetailsChallengeRes,
      )
      expect(setCustomFieldAction.value).to.equal(
        addInterfaceInteraction.fields.response,
      )
    },
  )

  it(
    'when "submitPaymentDetailsRequest" does not contain "paymentData", ' +
      'then it should add paymentData to the request',
    async () => {
      scope
        .post('/payments/details')
        .reply(200, submitPaymentDetailsChallengeRes)

      const requestWithoutPaymentData = _.cloneDeep(submitPaymentDetailsRequest)
      delete requestWithoutPaymentData.paymentData

      const ctpPaymentClone = _.cloneDeep(ctpPayment)
      ctpPaymentClone.custom.fields.submitAdditionalPaymentDetailsRequest =
        JSON.stringify(requestWithoutPaymentData)
      ctpPaymentClone.custom.fields.makePaymentResponse =
        makePaymentRedirectResponse
      ctpPaymentClone.custom.fields.adyenMerchantAccount = adyenMerchantAccount

      const response = await execute(ctpPaymentClone)

      const addInterfaceInteraction = response.actions.find(
        (a) => a.action === 'addInterfaceInteraction',
      )
      const request = JSON.parse(addInterfaceInteraction.fields.request)
      const requestBody = JSON.parse(request.body)
      expect(requestBody.paymentData).to.equal(
        JSON.parse(makePaymentRedirectResponse).paymentData,
      )
    },
  )

  it(
    'when "submitPaymentDetailsRequest" contains "paymentData", ' +
      'then it should NOT add paymentData to the request',
    async () => {
      scope
        .post('/payments/details')
        .reply(200, submitPaymentDetailsChallengeRes)
      const testPaymentData = 'paymentDataFromSubmitPaymentDetailsRequest'

      const requestWithoutPaymentData = _.cloneDeep(submitPaymentDetailsRequest)
      requestWithoutPaymentData.paymentData = testPaymentData

      const ctpPaymentClone = _.cloneDeep(ctpPayment)
      ctpPaymentClone.custom.fields.submitAdditionalPaymentDetailsRequest =
        JSON.stringify(requestWithoutPaymentData)
      ctpPaymentClone.custom.fields.makePaymentResponse =
        makePaymentRedirectResponse
      ctpPaymentClone.custom.fields.adyenMerchantAccount = adyenMerchantAccount

      const response = await execute(ctpPaymentClone)

      const addInterfaceInteraction = response.actions.find(
        (a) => a.action === 'addInterfaceInteraction',
      )
      const request = JSON.parse(addInterfaceInteraction.fields.request)
      const requestBody = JSON.parse(request.body)
      expect(requestBody.paymentData).to.equal(testPaymentData)
    },
  )

  it(
    'when "removeSensitiveData" is false, ' +
      'then it should not remove sensitive data',
    async () => {
      const extensionDummyConfig = {
        removeSensitiveData: false,
        port: 8080,
        logLevel: 'debug',
        apiExtensionBaseUrl: 'testUrl',
        basicAuth: false,
        keepAliveTimeout: 10,
      }

      const sandbox = sinon.createSandbox()
      sandbox.stub(config, 'getModuleConfig').returns(extensionDummyConfig)

      scope
        .post('/payments/details')
        .reply(200, submitPaymentDetailsSuccessResponse)

      const ctpPaymentClone = _.cloneDeep(ctpPayment)
      ctpPaymentClone.custom.fields.submitAdditionalPaymentDetailsRequest =
        JSON.stringify(submitPaymentDetailsRequest)
      ctpPaymentClone.custom.fields.makePaymentResponse = JSON.stringify(
        makePaymentRedirectResponse,
      )
      ctpPaymentClone.custom.fields.adyenMerchantAccount = adyenMerchantAccount

      const response = await execute(ctpPaymentClone)

      expect(response.actions).to.have.lengthOf(4)
      const addInterfaceInteractionAction = response.actions.find(
        (a) => a.action === 'addInterfaceInteraction',
      )
      expect(addInterfaceInteractionAction.fields.response).to.include(
        'additionalData',
      )
      const setCustomFieldAction = response.actions.find(
        (a) => a.action === 'setCustomField',
      )
      expect(setCustomFieldAction.value).to.include('additionalData')
      const setKeyAction = response.actions.find((a) => a.action === 'setKey')
      expect(setKeyAction.key).to.equal(
        JSON.parse(submitPaymentDetailsSuccessResponse).pspReference,
      )
      sandbox.restore()
    },
  )

  it(
    'when "removeSensitiveData" is true, ' +
      'then it should remove sensitive data',
    async () => {
      const extensionDummyConfig = {
        removeSensitiveData: true,
        port: 8080,
        logLevel: 'debug',
        apiExtensionBaseUrl: 'testUrl',
        basicAuth: false,
        keepAliveTimeout: 10,
      }

      const sandbox = sinon.createSandbox()
      sandbox.stub(config, 'getModuleConfig').returns(extensionDummyConfig)

      scope
        .post('/payments/details')
        .reply(200, submitPaymentDetailsSuccessResponse)

      const ctpPaymentClone = _.cloneDeep(ctpPayment)
      ctpPaymentClone.custom.fields.submitAdditionalPaymentDetailsRequest =
        JSON.stringify(submitPaymentDetailsRequest)
      ctpPaymentClone.custom.fields.makePaymentResponse = JSON.stringify(
        makePaymentRedirectResponse,
      )
      ctpPaymentClone.custom.fields.adyenMerchantAccount = adyenMerchantAccount

      const response = await execute(ctpPaymentClone)

      expect(response.actions).to.have.lengthOf(4)
      const addInterfaceInteractionAction = response.actions.find(
        (a) => a.action === 'addInterfaceInteraction',
      )
      expect(addInterfaceInteractionAction.fields.response).to.not.include(
        'additionalData',
      )
      const setCustomFieldAction = response.actions.find(
        (a) => a.action === 'setCustomField',
      )
      expect(setCustomFieldAction.value).to.not.include('additionalData')
      const setKeyAction = response.actions.find((a) => a.action === 'setKey')
      expect(setKeyAction.key).to.equal(
        JSON.parse(submitPaymentDetailsSuccessResponse).pspReference,
      )
      sandbox.restore()
    },
  )

  it(
    'when transaction already exists in the payment, ' +
      'then it should not add new transaction',
    async () => {
      scope
        .post('/payments/details')
        .reply(200, submitPaymentDetailsSuccessResponse)

      const ctpPaymentClone = _.cloneDeep(ctpPayment)
      ctpPaymentClone.custom.fields.submitAdditionalPaymentDetailsRequest =
        JSON.stringify(submitPaymentDetailsRequest)
      ctpPaymentClone.custom.fields.makePaymentResponse = JSON.stringify(
        makePaymentRedirectResponse,
      )
      ctpPaymentClone.custom.fields.adyenMerchantAccount = adyenMerchantAccount
      ctpPaymentClone.transactions.push({
        id: 'e759b1a7-3666-46d0-80fa-051849144087',
        type: 'Authorization',
        amount: {
          type: 'centPrecision',
          currencyCode: 'EUR',
          centAmount: 1000,
          fractionDigits: 2,
        },
        interactionId: '852588749855524C',
        state: 'Success',
      })

      const response = await execute(ctpPaymentClone)

      expect(response.actions).to.have.lengthOf(3)
      const addTransaction = response.actions.find(
        (a) => a.action === 'addTransaction',
      )
      expect(addTransaction).to.be.undefined
      const setKeyAction = response.actions.find((a) => a.action === 'setKey')
      expect(setKeyAction.key).to.equal(
        JSON.parse(submitPaymentDetailsSuccessResponse).pspReference,
      )
    },
  )
})
