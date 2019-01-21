const httpUtils = require('../../service')

class HealthController {
  checkHealth (request, response) {
    httpUtils.sendResponse(response, 200)
  }
}

module.exports = new HealthController()
