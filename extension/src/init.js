const init = require('./server.js').setupServer()
require('./config/config')

const { initResources } = require('./config/init/initResources')

const port = 8080

init.listen(port, async () => {
  await initResources()
  console.log(`Server running at http://127.0.0.1:${port}/`)
})
