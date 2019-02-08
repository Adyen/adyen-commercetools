const ngrok = require('ngrok')   // eslint-disable-line

async function init (port) {
  const ngrokUrl = await ngrok.connect(port)
  process.env.API_EXTENSION_BASE_URL = ngrokUrl
  return ngrokUrl
}

async function destroy () {
  await ngrok.kill()
}

module.exports = { init, destroy }
