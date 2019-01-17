const http = require('http')

http.createServer(function (request, response) {
  console.log('request url', request.url)
  console.log('request ', JSON.stringify(request.url))
}).listen(8125)

console.log('Server running at http://127.0.0.1:8125/')
