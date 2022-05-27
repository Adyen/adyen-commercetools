import utils from '../../utils/commons.js'

function processRequest(request, response) {
  utils.sendResponse(response, 200)
}

export { processRequest }
