const server = require('../../src/server').setupServer()

const { ensureResources } = require('./init/init-resources')
const testUtils = require('../test-utils')

async function prepareProject(ctpClient) {
  await ensureResources(ctpClient)
}

async function startServer(testServerPort = 8000) {
  return new Promise((resolve) => {
    server.listen(testServerPort, async () => {
      resolve()
    })
  })
}

function stopServer() {
  server.close()
}

async function cleanupProject(ctpClient) {
  await testUtils.deleteAllResources(ctpClient, 'payments')
  await testUtils.deleteAllResources(ctpClient, 'types')
  await testUtils.deleteAllResources(ctpClient, 'extensions')
}

module.exports = {
  prepareProject,
  cleanupProject,
  startServer,
  stopServer,
}
