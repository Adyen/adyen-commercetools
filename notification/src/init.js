const server = require('./server.js')
const { ensureInterfaceInteractionCustomType } = require('./config/init/ensure-interface-interaction-custom-type')
const ctp = require('./utils/ctp')
const ctpClient = ctp.get(config)

const PORT = process.env.PORT || 443

server.listen(PORT, async () => {
  await ensureInterfaceInteractionCustomType(ctpClient)
  console.log(`Server running at http://127.0.0.1:${PORT}/`)
})
