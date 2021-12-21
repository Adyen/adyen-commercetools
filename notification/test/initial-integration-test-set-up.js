const { startIT, stopIT } = require('./test-utils')

before(async () => {
  await startIT()
})

after(() => {
  stopIT()
})
