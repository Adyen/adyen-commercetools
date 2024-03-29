import nock from 'nock'
import config from '../../src/config/config.js'

function _mockCtpCartsEndpoint(mockCart, commercetoolsProjectKey) {
  const ctpConfig = config.getCtpConfig(commercetoolsProjectKey)
  const ctpApiScope = nock(`${ctpConfig.apiUrl}`)
  const ctpAuthScope = nock(`${ctpConfig.authUrl}`)
  ctpAuthScope.post('/oauth/token').reply(200, {
    access_token: 'xxx',
    token_type: 'Bearer',
    expires_in: 172800,
    scope: 'manage_project:xxx',
  })
  ctpApiScope
    .get(`/${ctpConfig.projectKey}/carts`)
    .query(true)
    .reply(200, { results: [mockCart] })
}

function _mockCtpCustomerEndpoint(mockCustomer, commercetoolsProjectKey) {
  const ctpConfig = config.getCtpConfig(commercetoolsProjectKey)
  const ctpApiScope = nock(`${ctpConfig.apiUrl}`)
  const ctpAuthScope = nock(`${ctpConfig.authUrl}`)
  ctpAuthScope.post('/oauth/token').reply(200, {
    access_token: 'xxx',
    token_type: 'Bearer',
    expires_in: 172800,
    scope: 'manage_project:xxx',
  })
  ctpApiScope
    .get(`/${ctpConfig.projectKey}/customers`)
    .query(true)
    .reply(200, { results: [mockCustomer] })
}

export default { _mockCtpCartsEndpoint, _mockCtpCustomerEndpoint }
