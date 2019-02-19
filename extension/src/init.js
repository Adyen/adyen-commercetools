const init = require('./server.js')
require('./config/config')

const port = parseInt(process.env.EXTENSION_PORT || 8080, 10)

init.listen(port, () => {
  console.log(`Server running at http://127.0.0.1:${port}/`)
})
