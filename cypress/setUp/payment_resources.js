// Prepare all CTP resources that are needed to execute Adyen payments
// like custom types, API integration

const { initResources } = require('../../extension/src/config/init/initResources')
const testUtils = require('../../extension/test/test-utils')
const ctpClientBuilder = require('../../extension/src/ctp/ctp')

async function init () {
  const ctpClient = ctpClientBuilder.get()
  await testUtils.deleteAllResources(ctpClient, 'payments')
  await Promise.all([
    testUtils.deleteAllResources(ctpClient, 'types'), testUtils.deleteAllResources(ctpClient, 'extensions')
  ])
  await initResources()
}

module.exports = { init }
