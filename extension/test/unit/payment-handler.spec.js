const nock = require('nock')
const _ = require('lodash')
const { expect } = require('chai')
const { handlePayment } = require('../../src/paymentHandler/payment-handler')
const submitPaymentDetailsChallengeRes = require('./fixtures/adyen-submit-payment-details-challenge-shopper-response')
const ctpPayment = require('./fixtures/ctp-payment.json')
const makePaymentRedirectResponse = require('./fixtures/adyen-make-payment-3ds-redirect-response')
const configLoader = require('../../src/config/config')
const c = require('../../src/config/constants')
const errorMessage = require('../../src/validator/error-messages')

describe('payment-handler::execute', () => {
  const config = configLoader.load()
  let scope
  /* eslint-disable max-len */
  const submitPaymentDetailsRequest = {
    details: {
      MD:
        'M2RzMi40YTdmZGFjNTIzMzQyNDllNWY1YmQyMWQ5OGZlMGI0YjRiYzViNjkyYmEzODZiNDE0NmE5YjgzYTMzNjQwODFh',
      PaRes:
        'BQABAgAl9h9S78IkDwV92Fa_O3ZdxU3sHIIa23Z0MT20jM5P74jtujtyy_dMqUL5IPiF_wb1tMvWJago_mdKRL6vQkBxxzg51N9M57akADykaDEm3NXLAPRWu7BIopC8zePXHxVte7Ui966ghJ5XFIZ_FfLaji1E_KFzzMqOOp72NxlTQGCwF8Usx2lCBvzfVhINGwuzu2pnjzxZatquaISb1epY82jrcDNAjL9JqkgJV_hodMkx0sRoVKqnjqsUiaVH0Gj3ppojuHrRNXmK0b4w2wYhlwRpczmNxN8UrMTXHX3lrROQXAq78d3xBMDmoV61H6KNPrFjFoAtcdz0dWMMk97JdtuWyBzqJ5kkCX1G2VrzXm4CnBNwogZrVvsd_KBssVgEmd4uNcYYYheSFA64FqTKL1_OEvnz6iOJ3lGdmE3UFA2rtQ7h16VUGXX9V0vUeibJXW1yAUP1GCjNnVNbdX9vTYfZubZ28pZZD09qkcnkPmnrgc9ElC2dwa1R2mOwYePco9OUH7YN0jBPt9Mp_l_5f4imIalclKtLya-VFmbbn0NFOY8UAsotl3Vs3otZa1tWxQ4Qkf9u7SG_biQORIUltlCgwCJG9ZAC6qSZgV1IOU9KB2uDPlF2MxFINYYJGtar4aSADc7lJtD-6aGz2Iev068snyqAkyvejzJUPuCsoBBV7DTmTcao_YSOzGKHhd3AAEp7ImtleSI6IkFGMEFBQTEwM0NBNTM3RUFFRDg3QzI0REQ1MzkwOUI4MEE3OEE5MjNFMzgyM0Q2OERBQ0M5NEI5RkY4MzA1REMiferf2airaRV3vVaz6LGdyZzAUFUTMy1y3rxMZfNiLU4b2QFrRmbamSpQ5d6KU43eBFnCBOUpEmX956Jv5dFWEfbQ8aiAN_rTLjIuBQABAQBeihZONltVS1RSkIq15Ncaf0TJP_RUw_nS4u2B48E7RdTAp8Fha3zkO5pVQtcOxmNEnD6MgSrt-8S9ctb52NzzpGkUuI372lqiQ4D0MCn49uuT8RZ2sl9ommdChKCfjuPsPnMMxUQGITmOPNUliE8BX280OeNQ4DHw6rV7Qv4al1KXw1c2DwETC-bxKRKsG7U22j5qA1JcraRhCFGZ0q43_6HZbWaa6-A_2PQlwFVL_8ywbjnR7orHJo91SWbDaFL99hnnGwHOFXdOeOaRgfgJsMoDssDaCLvba4XFOpF0crgj8-BMeto6wIYsB_e2E36UMMCg3U7ZR7L64m37v09JEAeTzYHTOwPrJTKuHNoZlYAAANyzlMKxcO1IcS5Eg7p7MRY4OPS88PlW2MWHK31YErfu2KQChEmJV16-zuQuT871Sq0VDirRXBCQ881TUlFd584SvO3PGSoAoibAAW73Anc7NvWlRe1bOoPgyA55uTD6FvElntRPFEg4w9Wc_8BU6y5PQ2nrqQmKroLRYjfxR2RT3xAjyV5gg0lEHt-WAqx30BXMFJct2hufvaliS5yEqZ6X4YjbGNT_UHUTu2QlnjOwik98E-HaZcctB7U4eARLCUDnFsK7KVoixdeXOmYwEZRXyfgNdW97PEvVvZNqFVcMlxSQo7-taaJwaOCUtTj__ynIfCsmonjWXNC_sIELyGSOEScxbSO8p8QXPVlrEbh58APJykjEncC9nSBj4nOWagN61cCBCfG_jGsPULkGmkLh-vXCee0PX_juY6bhw5-pZ7Juz-q8nGHYN5YML4txMHqTHb46O7HXZ3_QpZxEfvptp_HYcWotnSdnpjLQW-aF3V3IuaNNJIWWXGSZeeuAfnuBQMzbxFzfkJthUeQytt-TJXjrybTmzr_BpTT-6u9w3At4EnNcxUIYkgtwYvUerc0foK6rVjWqWJXMlv_zSjVzhbtXBMnACQEtbU6jlp0TRM8xgd-_XCwVjYHX9o7CXEqB_kx2IVPlAW5T2UR9U6ZKOctxJ_m7p46CZONpj29lGzDIWwp6syvKUazOmzPo9-VHaG0zoCv62824prcEQRM779jiU2k0zDnf7VNBjoode8o9Af_RBeEST02El5G_9J5cVrBPRNRNS9o1mxBPJO--KlBkg_FbwEq7M1y5MIHacqtBZN3UGq2esEB7xh3FJWiwL5O0XxLn41CI0FiQ0csXdzUaLOU96my467gNEZGk00p_B9Dl-3a8Gm6fIR5OEQNpeh7FBWMGF5UoBG20pyXvn8nJhnGmSMB4ARh8PWCEZCeEMwAAnTTy0aXTg8uJBc6u8pcbB4fOhj92mXyudgMJnxwHnIC3qMGbOvBJs3HTGakUObChVbzaAH27R9rVBtHhmr2P1BZNF68dnlNTuLil3_PlhlJuNwQepxooyGuTZMqPUx9Vu7ufLoOKEo9gtY4b_hmqSKuVNbENeHNxPhwdwg-ifGJSjqfxAot9X4S8NvJv3AQEJn5xha_grAh7Pu6T4I0AF_EuS6o14Wm1hZ4dobkABgfDXpXKvB98wr9HL8W23wkiAImMvLgefd5OmnO0P4vS7hf0vyOzwpfrgMcHG4QrBI2U2DRRJmIqPFICTuwNPXX3nQ3l1YfhtGIzmToW6EXVdnkGXvIjHmfbgF0XCcCP5M2YTf-89HJ6fV81vFRnd74gB-fjQ42_14JvnaOIbAIKehw1oe-QdSgfjuz9bp_zzzytF1xD4al4m1yeZ6ObKF-v_7L0yYnWfjZwcQZGJqWhQLOOtnv8D9sDjX2HwLi_A36WaqvyNFk3DKTt35le2fOgCXT9o_k3p-olYkyOVSRTfIWhdVth5iKYxmF6aKzSZByrFnMbVlFuwh1bTW9p12g258MQ3nWe4OvpMRzP5ymRnsjPk0enmVJf-ynrFcjzUmMXZlT-6kv5zDdyFVwBRwVyK2ro_uJ2wf9VqvGmjxhwPe33kYnqcb58_AnNyMR7tZVSIlTV3JdImAh9zk0HTzWw1nkRpYakYz79U0o6tZIsTL5q1VxvUk5N2bQB9tMyxw9gpxC1rzlTQWKHh4qRFfFztIE3OEA1jjnz2GUCPg4Omu9lAUZqjTnIjBavNsoa2zAxk4WaPPWbulChMXPN5k08DYKqJno5to6FU79CDhbPyDC2FD49bxjm_Z_zG2my5hzNVWoN_bM',
    },
  }
  /* eslint-enable max-len */

  beforeEach(() => {
    scope = nock(`${config.adyen.apiBaseUrl}`)
  })

  afterEach(() => {
    nock.cleanAll()
  })

  it(
    'when payment contains "submitAdditionalPaymentDetailsRequest" with "makePaymentResponse", ' +
      'then it should call /payments/details on Adyen',
    async () => {
      scope
        .post('/payments/details')
        .reply(200, submitPaymentDetailsChallengeRes)

      const ctpPaymentClone = _.cloneDeep(ctpPayment)
      ctpPaymentClone.custom.fields.makePaymentResponse = JSON.stringify(
        makePaymentRedirectResponse
      )
      ctpPaymentClone.custom.fields.submitAdditionalPaymentDetailsRequest = JSON.stringify(
        submitPaymentDetailsRequest
      )

      const response = await handlePayment(ctpPaymentClone)

      expect(response.data.actions).to.have.lengthOf.above(0)
    }
  )

  it(
    'when payment does not contain "makePaymentResponse", ' +
      'then it should not call /payments/details on Adyen',
    async () => {
      scope
        .post('/payments/details')
        .reply(200, submitPaymentDetailsChallengeRes)

      const ctpPaymentClone = _.cloneDeep(ctpPayment)
      ctpPaymentClone.custom.fields.submitAdditionalPaymentDetailsRequest = JSON.stringify(
        submitPaymentDetailsRequest
      )

      const response = await handlePayment(ctpPaymentClone)

      expect(response.data.actions).to.have.lengthOf(0)
    }
  )

  it(
    'when "submitAdditionalPaymentDetailsRequest" contains the same request, ' +
      'then it should NOT call /payments/details on Adyen if response exists',
    async () => {
      scope
        .post('/payments/details')
        .reply(200, submitPaymentDetailsChallengeRes)

      const oldSubmitPaymentDetailsRequest = _.cloneDeep(
        submitPaymentDetailsRequest
      )
      oldSubmitPaymentDetailsRequest.paymentData = JSON.parse(
        makePaymentRedirectResponse
      ).paymentData

      const ctpPaymentClone = _.cloneDeep(ctpPayment)
      ctpPaymentClone.interfaceInteractions = [
        {
          type: {
            typeId: 'type',
            id: 'bdbd6d06-9e29-4470-a3de-76b529c9eb5e',
          },
          fields: {
            type: c.CTP_INTERACTION_TYPE_SUBMIT_ADDITIONAL_PAYMENT_DETAILS,
            request: JSON.stringify(oldSubmitPaymentDetailsRequest),
          },
        },
      ]
      ctpPaymentClone.custom.fields.makePaymentResponse = makePaymentRedirectResponse
      ctpPaymentClone.custom.fields.submitAdditionalPaymentDetailsRequest = JSON.stringify(
        submitPaymentDetailsRequest
      )
      const response = await handlePayment(ctpPaymentClone)

      expect(response.data.actions).to.have.lengthOf(0)
    }
  )

  it(
    'when "submitAdditionalPaymentDetailsRequest" contains a different request, ' +
      'then it should call /payments/details on Adyen again',
    async () => {
      scope
        .post('/payments/details')
        .reply(200, submitPaymentDetailsChallengeRes)

      const ctpPaymentClone = _.cloneDeep(ctpPayment)
      ctpPaymentClone.interfaceInteractions = [
        {
          type: {
            typeId: 'type',
            id: 'bdbd6d06-9e29-4470-a3de-76b529c9eb5e',
          },
          fields: {
            type: c.CTP_INTERACTION_TYPE_SUBMIT_ADDITIONAL_PAYMENT_DETAILS,
            request: JSON.stringify(submitPaymentDetailsRequest),
          },
        },
      ]
      ctpPaymentClone.custom.fields.makePaymentResponse = makePaymentRedirectResponse
      ctpPaymentClone.custom.fields.submitAdditionalPaymentDetailsRequest = JSON.stringify(
        {
          details: {
            MD: 'newMD',
            PaRes: 'newPaRes',
          },
        }
      )
      const response = await handlePayment(ctpPaymentClone)

      expect(response.data.actions).to.have.lengthOf.above(0)
    }
  )

  it(
    'when "submitAdditionalPaymentDetailsRequest" contains a request and payment has no interface interaction, ' +
      'then it should call /payments/details on Adyen',
    async () => {
      scope
        .post('/payments/details')
        .reply(200, submitPaymentDetailsChallengeRes)

      const ctpPaymentClone = _.cloneDeep(ctpPayment)
      ctpPaymentClone.interfaceInteractions = []
      ctpPaymentClone.custom.fields.makePaymentResponse = makePaymentRedirectResponse
      ctpPaymentClone.custom.fields.submitAdditionalPaymentDetailsRequest = JSON.stringify(
        {
          details: {
            MD: 'newMD',
            PaRes: 'newPaRes',
          },
        }
      )
      const response = await handlePayment(ctpPaymentClone)
      expect(response.data.actions).to.have.lengthOf.above(0)
    }
  )

  describe('amountPlanned', () => {
    it(
      'is different than the amount in makePayment request custom field and interface interaction is empty, ' +
        'then it should return errors',
      async () => {
        const ctpPaymentClone = _.cloneDeep(ctpPayment)
        ctpPaymentClone.amountPlanned.centAmount = 0
        ctpPaymentClone.custom.fields.makePaymentRequest = JSON.stringify({
          reference: 'YOUR_REFERENCE',
          amount: {
            currency: 'EUR',
            value: 1000,
          },
        })
        ctpPaymentClone.interfaceInteractions = []

        const response = await handlePayment(ctpPaymentClone)

        expect(response.success).to.equal(false)
        expect(response.data.errors).to.have.lengthOf.above(0)
        expect(response.data.errors[0].message).to.equal(
          errorMessage.AMOUNT_PLANNED_NOT_SAME
        )
      }
    )

    it(
      'is 10 and makePayment request does not exist and interface interaction is empty, ' +
        'then it should not return errors',
      async () => {
        const ctpPaymentClone = _.cloneDeep(ctpPayment)
        ctpPaymentClone.amountPlanned.centAmount = 10
        ctpPaymentClone.custom.fields = {}
        ctpPaymentClone.interfaceInteractions = []

        const response = await handlePayment(ctpPaymentClone)

        expect(response.success).to.equal(true)
        expect(response.data.actions).to.deep.equal([])
      }
    )

    it('is different than makePayment interface interaction, then it should return errors', async () => {
      const ctpPaymentClone = _.cloneDeep(ctpPayment)
      ctpPaymentClone.amountPlanned.centAmount = 100
      ctpPaymentClone.custom.fields = {
        makePaymentRequest: JSON.stringify({
          amount: {
            currency: 'EUR',
            value: 100,
          },
          reference: 'YOUR_REFERENCE',
        }),
      }
      ctpPaymentClone.interfaceInteractions = [
        {
          fields: {
            type: 'makePayment',
            request: JSON.stringify({
              amount: {
                currency: 'EUR',
                value: 10,
              },
            }),
            createdAt: '2018-05-14T07:18:37.560Z',
          },
        },
      ]

      const response = await handlePayment(ctpPaymentClone)

      expect(response.success).to.equal(false)
      expect(response.data.errors[0].message).to.equal(
        errorMessage.AMOUNT_PLANNED_NOT_SAME
      )
    })
  })
})
