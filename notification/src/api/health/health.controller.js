import { sendResponse } from '../../utils/commons.js'

function processRequest(request, response) {
  sendResponse(response, 200)
}

export { processRequest }
