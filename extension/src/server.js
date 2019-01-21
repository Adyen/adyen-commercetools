const server = require('./controller.js')
require('./config/ctpConfig.js')

const port = 8080

server.listen(port, () => {
  console.log(`Server running at http://127.0.0.1:${port}/`)
})
