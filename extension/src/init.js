const init = require('./server.js').setupServer()
require('./config/config')

const { ensureResources } = require('./config/init/ensure-resources')

const port = parseInt(process.env.EXTENSION_PORT || 8080, 10)

init.listen(port, async () => {
  await ensureResources()
  console.log(`Server running at http://127.0.0.1:${port}/`)
})
