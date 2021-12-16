const {
  startLocal,
  stopLocal,
  startCI,
  stopCI,
} = require('./integration/integration-test-set-up')

before(async () => {
  if (process.env.CI) {
    // Github actions sets CI env variable to true.
    await startCI()
  } else {
    await startLocal()
  }
})

after(async () => {
  if (process.env.CI) {
    await stopCI()
  } else {
    await stopLocal()
  }
})
