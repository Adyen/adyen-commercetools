global.window = {}
global.navigator = {}

const pMap = require('p-map')

process.on('unhandledRejection', (reason) => {
  /* eslint-disable no-console */
  console.error('Unhandled Rejection:', reason)
  process.exit(1)
})

function deleteResource(ctpClient, endpoint, item) {
  const uri = ctpClient.builder[endpoint]
  return ctpClient.delete(uri, item.id, item.version)
}

async function unpublish(ctpClient, product) {
  const uri = ctpClient.builder.products
  const actions = [
    {
      action: 'unpublish',
    },
  ]
  return ctpClient.update(uri, product.id, product.version, actions)
}

async function publish(ctpClient, product) {
  const uri = ctpClient.builder.products
  const actions = [
    {
      action: 'publish',
    },
  ]
  return ctpClient.update(uri, product.id, product.version, actions)
}

function deleteAllResources(ctpClient, endpoint, condition) {
  let requestBuilder = ctpClient.builder[endpoint]

  if (condition) requestBuilder = requestBuilder.where(condition)

  return ctpClient.fetchBatches(requestBuilder, (items) =>
    pMap(
      items,
      async (item) => {
        if (endpoint === 'products' && item.masterData.published) {
          const { body } = await unpublish(ctpClient, item)
          item = body
        }

        return deleteResource(ctpClient, endpoint, item)
      },
      { concurrency: 10 }
    )
  )
}

module.exports = {
  publish,
  deleteAllResources,
}
