const server = require('./server.js')
const PORT = process.env.PORT || 8081

server.listen(PORT, () => {
  console.log(`Server running at http://127.0.0.1:${PORT}/`)
})
