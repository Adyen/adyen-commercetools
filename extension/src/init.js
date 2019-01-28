const init = require('./server.js')
require('./config/config')

const port = 8080

init.listen(port, () => {
  console.log(`Server running at http://127.0.0.1:${port}/`)
})
