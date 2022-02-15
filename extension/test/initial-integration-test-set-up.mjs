import testUtils from './test-utils.mjs'

const { startIT, stopIT } = testUtils

before(async () => {
  await startIT()
})

after(async () => {
  await stopIT()
})
