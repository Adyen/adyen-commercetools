const http = require('http')
const fs = require('fs')

const portNumber = 3000

const server = http.createServer((request, response) => {
  response.writeHeader(200, { 'Content-Type': 'text/html' })
  const readSream = fs.createReadStream(`${__dirname}/index.html`, 'utf8')
  readSream.pipe(response)
})
server.listen(portNumber)

console.log(`server is running on port number ${portNumber}`)
