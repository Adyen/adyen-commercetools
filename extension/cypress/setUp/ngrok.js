const ngrok = require('ngrok')   // eslint-disable-line

async function init (port) {
  process.env.API_EXTENSION_BASE_URL = await ngrok.connect(port)
}

async function destroy () {
  await ngrok.kill()
}

module.exports = { init, destroy }
