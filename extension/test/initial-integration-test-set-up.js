import { startIT, stopIT } from './test-utils.js'

before(async () => {
  await startIT()
})

after(async () => {
  await stopIT()
})
