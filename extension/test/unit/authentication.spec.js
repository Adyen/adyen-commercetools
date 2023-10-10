import { expect } from 'chai'
import sinon from 'sinon'
import config from '../../src/config/config.js'
import { generateBasicAuthorizationHeaderValue } from '../../src/validator/authentication.js'

describe('Authentication unit test', () => {
  const ctpDummyConfig = {
    clientId: 'clientId',
    clientSecret: 'clientSecret',
    projectKey: 'ctpProjectKey1',
    apiUrl: 'https://api.europe-west1.gcp.commercetools.com',
    authUrl: 'https://auth.europe-west1.gcp.commercetools.com',
    authentication: {
      scheme: 'basic',
      username: 'Aladdin',
      password: 'open sesame',
    },
  }
  it('if authentication object is found in config, it generates basic authorization header value', () => {
    const sandbox = sinon.createSandbox()
    sandbox.stub(config, 'getCtpConfig').returns(ctpDummyConfig)
    const result = generateBasicAuthorizationHeaderValue(
      ctpDummyConfig.projectKey,
    )
    expect(result).to.equal('Basic QWxhZGRpbjpvcGVuIHNlc2FtZQ==')
    sandbox.restore()
  })

  it('if authentication object is not found in config, it generates nothing', () => {
    ctpDummyConfig.authentication = undefined
    const sandbox = sinon.createSandbox()
    sandbox.stub(config, 'getCtpConfig').returns(ctpDummyConfig)
    const result = generateBasicAuthorizationHeaderValue(
      ctpDummyConfig.projectKey,
    )
    expect(result).to.not.exist
    sandbox.restore()
  })
})
