const httpUtils = require('../../utils')

// todo: implement proper health
function processRequest (request, response) {
  httpUtils.sendResponse({ response, statusCode: 200 })
}

module.exports = { processRequest }
