// Prepare all CTP resources that are needed to execute Adyen payments
// like custom types, API integration

const { initResources } = require('../../src/config/init/init-resources')
const testUtils = require('../../test/test-utils')
const ctpClientBuilder = require('../../src/ctp/ctp-client')

async function init () {
  const ctpClient = ctpClientBuilder.get()
  await testUtils.deleteAllResources(ctpClient, 'payments')
  await Promise.all([
    testUtils.deleteAllResources(ctpClient, 'types'), testUtils.deleteAllResources(ctpClient, 'extensions')
  ])
  await initResources()
}

module.exports = { init }
