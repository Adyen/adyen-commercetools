import nock from 'nock'
import { expect } from 'chai'
import _ from 'lodash'
import config from '../../src/config/config.js'
import makePaymentHandler from '../../src/paymentHandler/make-payment.handler.js'
import paymentSuccessResponse from './fixtures/adyen-make-payment-success-response.js'
import paymentErrorResponse from './fixtures/adyen-make-payment-error-response.js'
import paymentRefusedResponse from './fixtures/adyen-make-payment-refused-response.js'
import paymentRedirectResponse from './fixtures/adyen-make-payment-3ds-redirect-response.js'
import paymentValidationFailedResponse from './fixtures/adyen-make-payment-validation-failed-response.js'
import utils from '../../src/utils.js'

const { execute } = makePaymentHandler

describe('make-payment::execute', () => {
  let scope

  let ctpPayment

  /* eslint-disable max-len */
  const makePaymentRequest = {
    reference: 'YOUR_REFERENCE',
    riskData: {
      clientData:
        'eyJ2ZXJzaW9uIjoiMS4wLjAiLCJkZXZpY2VGaW5nZXJwcmludCI6ImRmLXRpbWVkT3V0In0=',
    },
    paymentMethod: {
      type: 'scheme',
      encryptedCardNumber:
        'adyenjs_0_1_25$DUEzRRqi0giNphYds8B1/AhDcp1Mx9fM6uFW/fxx7HcO2vd8Lt/tT0IgODmu16duCco+vnB+HFJVV5t3m6yD93AZxA/ugFU7uzggh7UNAKPd3khkpReBRoHSzLwyj9dRnOxTDYWRX+K/3ozT+9RXvfHoPL1nWhU6A0DIKAdjiurDRHZA657XNZKd2M090R1yhqmIGH7rkHNJ3yV7/Ox/qTi5KLB4TmiEpGKD/sbuy18hG69om+66+BttPglSwPFZIy8zNXuqetYQaLY+cVlYfdKcRgEvoKJay85AtZgbxGvpp6pB+AXzIR55HM+KYykxHcHc/7O6KRMWjoxOkd9vpA==$FkH2iICmazYvxCLQ9Cu8zmFHfoXwcCZ/tMGuPyulvuyRar9Z5SMAx9GyTQvSHzTYNhglA4wQJNoEP9Vt9hnOUWdonWLMbLBDt4QhuB6c2kGcGRU7As6cBkDqllTNjItFY/19bpHIfWs50s+KbJSraAQNihpBkhRjKcXZeuxleOkpZK8Ta6B3jOLLcVXkjAYtcGl220KlOaT760UsqQpxD2UuM8UQVZEFml2WDZe1dmbzpebZVCDcy07KBy5ClsxqIErFwZkr22GXzrgg4Vg+WUg3XpAWGibRZvAsIlZO7AcVWgRzb1Sc/eA9lML0TkwS1+43vh6Z4FsVtgBI7lNFuqN9tsFba4UW1pKM3cnjL/BKH69rXO5dMZWLs0HSiGpGoOAudJTrq7T3SfiuNDignlWkww2MYuDFPxXw7H7n1gXXwczwQCVCPxh3y8xv2OM/67/Re5+zQ88N3qn+rjXssCjEtIsl5SqLJ8k675ULrS1oW8z9NoxfkE8RsKx9drrWOp37TtkRqAgqhUMgFqQM8yXo8jkujBc4EGQMysNY46lDGZkapfNIyoT6ncAJOCj8Sy8toVBrhfRqAEOFxF8weHas69EZEGxqgIlccaBKec1/TyjkUEvscST4gNcO29b3e9wV4TO73XTziqKNY5akG2uqY1YYyzQkE+AwjpDxw5JTUuuSh14bXr853W5/dy7rw9qrr3P+1iONsIqcgW7mVb596hD0J86Zc+hfbsQn1e/sFaalCX18n/PyOD9c1Fqqox2KVJQ53OuUM0HfzErb8LW0SOhD6Rcban9cWsdLmIOPpIv1d5VPUpmDb+Sa5PLXgP+IPtS5yms/i/GGn1B/ykak9t1UBe1zR71r4CqKey5lRbjYV3lOlO4WAIjLyIYYBNAjZuH3qd/KGjHTaK88DnZM6Rpr+TTNlTO1c0fs/nm8xy0rmE9QBM5bkn0LfIwli4fkRefI3rQz1doJ+plBHl4w8lk5Oe45+L01R9NhCoKYH8INwski5FxIt0SdiTD8nYnIdRzgBVrnLqf6EHvFMIwo+mcMPRv3+bbSlgLfeVvqxLSZcyz73vnP/stQPt80Q79Ru7FwUNkrXCELyMCd7CKATK5TysWN',
      encryptedExpiryMonth:
        'adyenjs_0_1_25$Idi+jcq3qQgNx/Fqr4MTpy2e6vnktdvn8jTqrqWTmAgYWvnx7Pmler69ANWLRuW54xL0BQ2r7WRYVZsuVun2oNuxij54CLUhsn7b++0CJjYAhwmH6Bu3s5edgKv/2DqraLB7gq8Cjw2gbc6HQFgxLpeWfJzosLQFPRLW9nVgrceXwGS42sm3u9IwXFidwyVTQq6WSxUEE+WFtfPUe0eJGaEGqwx2sgMm2o/oUgvyxiuTNu361oIYWHfNSsVsmqjLOPKX7ztmM0Y90AbE/+PLlg5ZC9jFZUReNy9o0IB2DbR7R1oCk5obLp0uJZrywwk0fCLLAI4niKWVeFy3wVUpeQ==$B/xn3zwyW+l7qqyd3mmZbRzAG36MG1DNbKAyqE8y0fkvEg0eXY3lsclmx34vM940EAz05QdkyYT6JTLfzTrkKstmj9nV0SnTGy0DMxY0BsOzYfkPVQC7oYkOGLk+EGZUgsKwfJBdVAcIgPIZmi4y+DVYlxLJTR6fXgh5Kvsg5w6DZriYtdjlyfS6nmRHCubBgdk9HHAjAHI4DI7tVpgowdP3Q7rGdlknjFIUbdgfXPpVj6RClti+Ku+sKSSucGpofOq/sjlG5UOM2MkxJ4P0ABSIoJGb6xpGyBFQ+yFpH1Cp3p5QsVfI/NEqvD8fKHgD0q0UJDhVzmpv8Zp3vExWB1H2+9vtEyOMwSoKuUwT0VgxT0saDu0/KZrTvw34q/6IruXQ/+qrMmw9dt4+cAJroV0ubdy1KZNy3QQ1Wvb5FZK6eXvmyF4UZuBzGxJTupjdLim9UwLGPGA2mUZZn1OW2pIp76PYv5CucqAet3bT4+k51A==',
      encryptedExpiryYear:
        'adyenjs_0_1_25$De1eSM6gNsQqfG81q9Qsz6jYKz2fk0/I4wfMz+ZKI4FQciwFD4TSHvxl6tJ90GvwDDEQpZVpZWWCfeWjqeFiCzAiP3iO+oM/Wa6jEjjFWI8pZ2QwVKhqemdPc37DbZxyNtlj7zMHL2BxNj7M1iuxIBm6pnUZVSnqXOMOLVzIbJDf0hVHAhp60i1L73msD7kmdeajZLlJqhZTTSoXFrmNSqHjis5bzLitpZrh4kOAMDTnMMs8ED/9KCYlXVQm1i5MWa/KPMi80psSI2Fzmq/nU8Ub5NzKF0VYdHbvsXOdXq6MAjnFu5QD6gRoNzowx4QkktwPckoBYKi70+FHKsX9Ew==$eEs0op2EAcFq9uIyUSRkTYqhgGT4r6YQWsCSN0aWVicCCO04FgxZ3uPh/xF3XsHOlqxz2PpBNiQRB0BNflrWvnwHAUDD/Fbvqhejadogx4wuH3WRqf+3nvxZKHW5ik7cDuE+BhIlAI075PY8q/RowWaDUDO8ZgjoQUIwuQuFmvjEbsu/nu9wTShM1//nNTIofc0jk1gc5u1hmqkIgA+MZWQYZ925wF2A5KQk+ncyBNC15c8z5ao03uAha872TWy6y7avUwv1ugXk/zgvBCCG87SRuu2G+R4rpro0fLjP5pxE8RTimWexRwDoPYPcztEUZcjv80jdEDPULciw9fdfefQzpgj1wieWtZTUsBm8lHG1mM6c+nJkS7JDrh12RbP3gDBUvJkBtmZBsTp3oevW6torfqTekUsBh6e2I1ual9xCmXLkKM4fusWWm7clGXe49fvqDJ3JZRezhvdqYR3GO2eKT3OvdHjtT1Rqul0Ewifo17Y=',
      encryptedSecurityCode:
        'adyenjs_0_1_25$d/OMm3cbLOV4Dk9+a7rmJjZBaOsDCka6bTiuDG/JeeBuKYNjocNRSFnlPk2oV2+zUZWCHVpiFNx2ws9hDiNz9uxllO3TUpRk3whZpj30a7WUjXYOEXYgynXVtqpULXB5zP8Ro+1jP1Dr2Zbt00N8WPfehz/BnfsOu4fn2DsMhrIDlldYucsB50q1HzyLCa5IUFIsPaGQFV6TwzInLbhvEt4Nq7P1WZ/KaqJhwYURNgU89cjLUtboqIw/NGoDxG8XzdfCyGQE4yJYItgq71kpzdpIl0onxoaOaBBOaAo6ig3zNVDXl667LYiCdO049zIysS0eqJrTfzyw3qQDbiz1OQ==$5lxjuK68dSuG9jXL+sGufH2X1m2P8Z+MpswXgz28Z9OMuXIqUUFStx0EGA5WFCCZyEjknIdMd6FzbUTSji2mVYbbZWLvcxuHb/xsERQeltO1W7joM0co6GHZcVg+Vr8wp4foUCthX1y5zcIcLDVw4L73CZeRjBZyyGGTeOFV4zAr0UAYKhjQbWHQ7d/SyZuRSZGk2NL6u/eY8bf5ogSHnkYSRtVJYd95WCBhpiZR1AWrjpZBJtDqh2q53zHZuWtwmIJiGO7lZZdDdc/TpbOsLpJWcOXq6UYPiwyfIuE8U6xKyLTumkHNOBv8vDHT2PRlyvufUcrp7XthYBpHJqADjD0jvb8Kn80tL7/RDmbCtTUzHq1GFlzB25nF4JErDPgUZ+BiSI7SlMGmeJdoy9RKP2DIKZEEiw1/w3dA/4ea5D7hZ3D53LKBJTEO7uyqTJI+/M1NuAKSeeFLZE9X95+AFpx3RDGKCG380PAH',
    },
    browserInfo: {
      acceptHeader: '*/*',
      colorDepth: 24,
      language: 'en-US',
      javaEnabled: false,
      screenHeight: 1050,
      screenWidth: 1680,
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.4044.92 Safari/537.36',
      timeZoneOffset: -120,
    },
    amount: {
      currency: 'EUR',
      value: 1000,
    },
  }
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
      'then it should return actions "addInterfaceInteraction", "setCustomField", "setKey" and "addTransaction"',
    async () => {
      scope.post('/payments').reply(200, paymentSuccessResponse)

      const ctpPaymentClone = _.cloneDeep(ctpPayment)
      ctpPaymentClone.custom.fields.makePaymentRequest =
        JSON.stringify(makePaymentRequest)
      ctpPaymentClone.custom.fields.adyenMerchantAccount = adyenMerchantAccount

      const response = await execute(ctpPaymentClone)

      expect(response.actions).to.have.lengthOf(6)

      const setMethodInfoMethod = response.actions.find(
        (a) => a.action === 'setMethodInfoMethod',
      )
      expect(setMethodInfoMethod.method).to.equal('scheme')

      const setMethodInfoName = response.actions.find(
        (a) => a.action === 'setMethodInfoName',
      )
      expect(setMethodInfoName.name).to.eql({ en: 'Credit Card' })

      const addInterfaceInteraction = response.actions.find(
        (a) => a.action === 'addInterfaceInteraction',
      )
      expect(addInterfaceInteraction.fields.type).to.equal('makePayment')
      expect(addInterfaceInteraction.fields.request).to.be.a('string')
      expect(addInterfaceInteraction.fields.response).to.be.a('string')
      expect(addInterfaceInteraction.fields.createdAt).to.be.a('string')

      const request = JSON.parse(addInterfaceInteraction.fields.request)
      const requestBody = JSON.parse(request.body)
      expect(requestBody.reference).to.deep.equal(makePaymentRequest.reference)
      expect(requestBody.riskData).to.deep.equal(makePaymentRequest.riskData)
      expect(requestBody.paymentMethod).to.deep.equal(
        makePaymentRequest.paymentMethod,
      )
      expect(requestBody.browserInfo).to.deep.equal(
        makePaymentRequest.browserInfo,
      )
      expect(requestBody.amount).to.deep.equal(makePaymentRequest.amount)
      expect(requestBody.merchantAccount).to.equal(adyenMerchantAccount)

      const setCustomFieldAction = response.actions.find(
        (a) => a.action === 'setCustomField',
      )
      expect(setCustomFieldAction.name).to.equal('makePaymentResponse')
      expect(setCustomFieldAction.value).to.be.a('string')
      expect(setCustomFieldAction.value).to.equal(
        addInterfaceInteraction.fields.response,
      )

      const setKeyAction = response.actions.find((a) => a.action === 'setKey')
      expect(setKeyAction.key).to.equal(
        JSON.parse(paymentSuccessResponse).pspReference,
      )

      const addTransaction = response.actions.find(
        (a) => a.action === 'addTransaction',
      )
      expect(addTransaction.transaction).to.be.a('object')
      expect(addTransaction.transaction.type).to.equal('Authorization')
      expect(addTransaction.transaction.state).to.equal('Success')
      expect(addTransaction.transaction.interactionId).to.equal(
        JSON.parse(paymentSuccessResponse).pspReference,
      )
    },
  )

  it(
    'when resultCode from Adyen is "RedirectShopper", ' +
      'then it should return actions "addInterfaceInteraction", "setCustomField" and "setKey"',
    async () => {
      scope.post('/payments').reply(200, paymentRedirectResponse)

      const ctpPaymentClone = _.cloneDeep(ctpPayment)
      ctpPaymentClone.custom.fields.makePaymentRequest =
        JSON.stringify(makePaymentRequest)
      ctpPaymentClone.custom.fields.adyenMerchantAccount = adyenMerchantAccount

      const response = await execute(ctpPaymentClone)

      expect(response.actions).to.have.lengthOf(5)

      const addInterfaceInteraction = response.actions.find(
        (a) => a.action === 'addInterfaceInteraction',
      )
      expect(addInterfaceInteraction.fields.type).to.equal('makePayment')
      expect(addInterfaceInteraction.fields.request).to.be.a('string')
      expect(addInterfaceInteraction.fields.response).to.be.a('string')
      expect(addInterfaceInteraction.fields.createdAt).to.be.a('string')

      const request = JSON.parse(addInterfaceInteraction.fields.request)
      const requestBody = JSON.parse(request.body)
      expect(requestBody.reference).to.deep.equal(makePaymentRequest.reference)
      expect(requestBody.riskData).to.deep.equal(makePaymentRequest.riskData)
      expect(requestBody.paymentMethod).to.deep.equal(
        makePaymentRequest.paymentMethod,
      )
      expect(requestBody.browserInfo).to.deep.equal(
        makePaymentRequest.browserInfo,
      )
      expect(requestBody.amount).to.deep.equal(makePaymentRequest.amount)
      expect(requestBody.merchantAccount).to.equal(adyenMerchantAccount)

      const setCustomFieldAction = response.actions.find(
        (a) => a.action === 'setCustomField',
      )
      expect(setCustomFieldAction.name).to.equal('makePaymentResponse')
      expect(setCustomFieldAction.value).to.be.a('string')
      expect(setCustomFieldAction.value).to.equal(
        addInterfaceInteraction.fields.response,
      )

      const setKeyAction = response.actions.find((a) => a.action === 'setKey')
      expect(setKeyAction.key).to.equal(makePaymentRequest.reference) // no pspReference until submitting additional details in redirect flow
    },
  )

  it(
    'when adyen validation failed, ' +
      'then it should return actions "addInterfaceInteraction", "setCustomField" and "setKey"',
    async () => {
      scope.post('/payments').reply(422, paymentValidationFailedResponse)

      const ctpPaymentClone = _.cloneDeep(ctpPayment)
      ctpPaymentClone.custom.fields.makePaymentRequest =
        JSON.stringify(makePaymentRequest)
      ctpPaymentClone.custom.fields.adyenMerchantAccount = adyenMerchantAccount

      const response = await execute(ctpPaymentClone)

      expect(response.actions).to.have.lengthOf(5)

      const addInterfaceInteraction = response.actions.find(
        (a) => a.action === 'addInterfaceInteraction',
      )
      expect(addInterfaceInteraction.fields.type).to.equal('makePayment')
      expect(addInterfaceInteraction.fields.request).to.be.a('string')
      expect(addInterfaceInteraction.fields.response).to.be.a('string')
      expect(addInterfaceInteraction.fields.createdAt).to.be.a('string')

      const request = JSON.parse(addInterfaceInteraction.fields.request)
      const requestBody = JSON.parse(request.body)
      expect(requestBody.reference).to.deep.equal(makePaymentRequest.reference)
      expect(requestBody.riskData).to.deep.equal(makePaymentRequest.riskData)
      expect(requestBody.paymentMethod).to.deep.equal(
        makePaymentRequest.paymentMethod,
      )
      expect(requestBody.browserInfo).to.deep.equal(
        makePaymentRequest.browserInfo,
      )
      expect(requestBody.amount).to.deep.equal(makePaymentRequest.amount)
      expect(requestBody.merchantAccount).to.equal(adyenMerchantAccount)

      const setCustomFieldAction = response.actions.find(
        (a) => a.action === 'setCustomField',
      )
      expect(setCustomFieldAction.name).to.equal('makePaymentResponse')
      expect(setCustomFieldAction.value).to.be.a('string')
      expect(setCustomFieldAction.value).to.equal(
        addInterfaceInteraction.fields.response,
      )

      const setKeyAction = response.actions.find((a) => a.action === 'setKey')
      expect(setKeyAction.key).to.equal(makePaymentRequest.reference)
    },
  )

  it(
    'when resultCode from Adyen is "Refused"' +
      'then it should return actions "addInterfaceInteraction", "setCustomField", ' +
      '"setKey" and "addTransaction"',
    async () => {
      scope.post('/payments').reply(422, paymentRefusedResponse)

      const ctpPaymentClone = _.cloneDeep(ctpPayment)
      ctpPaymentClone.custom.fields.makePaymentRequest =
        JSON.stringify(makePaymentRequest)
      ctpPaymentClone.custom.fields.adyenMerchantAccount = adyenMerchantAccount

      const response = await execute(ctpPaymentClone)

      expect(response.actions).to.have.lengthOf(6)

      const addInterfaceInteraction = response.actions.find(
        (a) => a.action === 'addInterfaceInteraction',
      )
      expect(addInterfaceInteraction.fields.type).to.equal('makePayment')
      expect(addInterfaceInteraction.fields.request).to.be.a('string')
      expect(addInterfaceInteraction.fields.response).to.be.a('string')
      expect(addInterfaceInteraction.fields.createdAt).to.be.a('string')

      const request = JSON.parse(addInterfaceInteraction.fields.request)
      const requestBody = JSON.parse(request.body)
      expect(requestBody.reference).to.deep.equal(makePaymentRequest.reference)
      expect(requestBody.riskData).to.deep.equal(makePaymentRequest.riskData)
      expect(requestBody.paymentMethod).to.deep.equal(
        makePaymentRequest.paymentMethod,
      )
      expect(requestBody.browserInfo).to.deep.equal(
        makePaymentRequest.browserInfo,
      )
      expect(requestBody.amount).to.deep.equal(makePaymentRequest.amount)
      expect(requestBody.merchantAccount).to.equal(adyenMerchantAccount)

      const setCustomFieldAction = response.actions.find(
        (a) => a.action === 'setCustomField',
      )
      expect(setCustomFieldAction.name).to.equal('makePaymentResponse')
      expect(setCustomFieldAction.value).to.be.a('string')
      expect(setCustomFieldAction.value).to.equal(
        addInterfaceInteraction.fields.response,
      )

      const setKeyAction = response.actions.find((a) => a.action === 'setKey')
      expect(setKeyAction.key).to.equal(
        JSON.parse(paymentRefusedResponse).pspReference,
      )

      const addTransaction = response.actions.find(
        (a) => a.action === 'addTransaction',
      )
      expect(addTransaction.transaction).to.be.a('object')
      expect(addTransaction.transaction.type).to.equal('Authorization')
      expect(addTransaction.transaction.state).to.equal('Failure')
      expect(addTransaction.transaction.interactionId).to.equal(
        JSON.parse(paymentRefusedResponse).pspReference,
      )
    },
  )

  it(
    'when resultCode from Adyen is "Error", ' +
      'then it should return actions "addInterfaceInteraction", "setCustomField", ' +
      '"setKey" and "addTransaction"',
    async () => {
      scope.post('/payments').reply(422, paymentErrorResponse)

      const ctpPaymentClone = _.cloneDeep(ctpPayment)
      ctpPaymentClone.custom.fields.makePaymentRequest =
        JSON.stringify(makePaymentRequest)
      ctpPaymentClone.custom.fields.adyenMerchantAccount = adyenMerchantAccount

      const response = await execute(ctpPaymentClone)

      expect(response.actions).to.have.lengthOf(6)

      const addInterfaceInteraction = response.actions.find(
        (a) => a.action === 'addInterfaceInteraction',
      )
      expect(addInterfaceInteraction.fields.type).to.equal('makePayment')
      expect(addInterfaceInteraction.fields.request).to.be.a('string')
      expect(addInterfaceInteraction.fields.response).to.be.a('string')
      expect(addInterfaceInteraction.fields.createdAt).to.be.a('string')

      const request = JSON.parse(addInterfaceInteraction.fields.request)
      const requestBody = JSON.parse(request.body)
      expect(requestBody.reference).to.deep.equal(makePaymentRequest.reference)
      expect(requestBody.riskData).to.deep.equal(makePaymentRequest.riskData)
      expect(requestBody.paymentMethod).to.deep.equal(
        makePaymentRequest.paymentMethod,
      )
      expect(requestBody.browserInfo).to.deep.equal(
        makePaymentRequest.browserInfo,
      )
      expect(requestBody.amount).to.deep.equal(makePaymentRequest.amount)
      expect(requestBody.merchantAccount).to.equal(adyenMerchantAccount)

      const setCustomFieldAction = response.actions.find(
        (a) => a.action === 'setCustomField',
      )
      expect(setCustomFieldAction.name).to.equal('makePaymentResponse')
      expect(setCustomFieldAction.value).to.be.a('string')
      expect(setCustomFieldAction.value).to.equal(
        addInterfaceInteraction.fields.response,
      )

      const setKeyAction = response.actions.find((a) => a.action === 'setKey')
      expect(setKeyAction.key).to.equal(
        JSON.parse(paymentErrorResponse).pspReference,
      )

      const addTransaction = response.actions.find(
        (a) => a.action === 'addTransaction',
      )
      expect(addTransaction.transaction).to.be.a('object')
      expect(addTransaction.transaction.type).to.equal('Authorization')
      expect(addTransaction.transaction.state).to.equal('Failure')
      expect(addTransaction.transaction.interactionId).to.equal(
        JSON.parse(paymentErrorResponse).pspReference,
      )
    },
  )

  it(
    'when payment method is not in the adyenPaymentMethodsToNames map, ' +
      'then it should return setMethodInfoMethodAction with payment method name',
    async () => {
      scope.post('/payments').reply(200, paymentSuccessResponse)

      const ctpPaymentClone = _.cloneDeep(ctpPayment)
      const makePaymentRequestClone = _.cloneDeep(makePaymentRequest)
      makePaymentRequestClone.paymentMethod.type = 'new payment method'
      ctpPaymentClone.custom.fields.makePaymentRequest = JSON.stringify(
        makePaymentRequestClone,
      )
      ctpPaymentClone.custom.fields.adyenMerchantAccount = adyenMerchantAccount

      const response = await execute(ctpPaymentClone)

      const setMethodInfoMethod = response.actions.find(
        (a) => a.action === 'setMethodInfoMethod',
      )
      expect(setMethodInfoMethod.method).to.equal('new payment method')

      const setMethodInfoName = response.actions.find(
        (a) => a.action === 'setMethodInfoName',
      )
      expect(setMethodInfoName).to.be.undefined
    },
  )

  it(
    'when payment method is null, ' +
      'then it should not return setMethodInfoMethodAction action',
    async () => {
      scope.post('/payments').reply(200, paymentSuccessResponse)

      const ctpPaymentClone = _.cloneDeep(ctpPayment)
      const makePaymentRequestClone = _.cloneDeep(makePaymentRequest)
      delete makePaymentRequestClone.paymentMethod.type
      ctpPaymentClone.custom.fields.makePaymentRequest = JSON.stringify(
        makePaymentRequestClone,
      )
      ctpPaymentClone.custom.fields.adyenMerchantAccount = adyenMerchantAccount

      const response = await execute(ctpPaymentClone)

      const setMethodInfoMethod = response.actions.find(
        (a) => a.action === 'setMethodInfoMethod',
      )
      expect(setMethodInfoMethod).to.be.undefined
    },
  )
})
