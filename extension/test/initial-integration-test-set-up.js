import { startIT, stopIT } from './test-utils.cjs'

before(async () => {
  await startIT()
})

after(async () => {
  await stopIT()
})
