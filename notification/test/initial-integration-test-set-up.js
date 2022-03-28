import { startIT, stopIT } from './test-utils'

before(async () => {
  await startIT()
})

after(async () => {
  await stopIT()
})
