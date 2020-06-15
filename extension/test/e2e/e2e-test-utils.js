async function pasteValue (page, selector, value) {
  return page.evaluate((data) => {
    document.querySelector(data.selector).value = data.value
  }, { selector, value })
}

async function executeInAdyenIframe (page, selector, executeFn) {
  for (const frame of page.mainFrame().childFrames()) {
    const elementHandle = await frame.$(selector)
    if (elementHandle) {
      await executeFn(elementHandle)
      break
    }
  }
}

module.exports = {
  pasteValue, executeInAdyenIframe
}
