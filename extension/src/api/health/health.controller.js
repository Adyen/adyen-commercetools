const httpUtils = require('../../utils')

function checkHealth (request, response) {
  httpUtils.sendResponse(response, 200)
}

module.exports = { checkHealth }
