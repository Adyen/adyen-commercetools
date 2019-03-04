const httpUtils = require('../../utils')

function processRequest (request, response) {
  httpUtils.sendResponse(response, 200)
}

module.exports = { processRequest }
