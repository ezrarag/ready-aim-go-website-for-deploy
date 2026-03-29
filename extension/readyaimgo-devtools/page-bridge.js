(() => {
  if (window.__RAG_DEVTOOLS_PAGE_BRIDGE__) {
    return
  }

  window.__RAG_DEVTOOLS_PAGE_BRIDGE__ = true

  const PAGE_SOURCE = 'rag-devtools-page'
  const EXTENSION_SOURCE = 'rag-devtools-extension'

  const formatArg = (arg) => {
    if (typeof arg === 'string') {
      return arg
    }

    if (arg instanceof Error) {
      return arg.stack || arg.message || String(arg)
    }

    try {
      return JSON.stringify(arg)
    } catch {
      return String(arg)
    }
  }

  const sendConsoleMessage = (level, args) => {
    window.postMessage(
      {
        source: PAGE_SOURCE,
        type: 'CONSOLE_LOG',
        level,
        message: args.map(formatArg).join(' '),
        timestamp: new Date().toISOString(),
      },
      '*'
    )
  }

  const originalError = console.error.bind(console)
  const originalWarn = console.warn.bind(console)

  console.error = (...args) => {
    originalError(...args)
    sendConsoleMessage('error', args)
  }

  console.warn = (...args) => {
    originalWarn(...args)
    sendConsoleMessage('warn', args)
  }

  window.addEventListener('message', (event) => {
    if (event.source !== window || !event.data || event.data.source !== EXTENSION_SOURCE) {
      return
    }

    if (event.data.type !== 'REQUEST_CONTEXT') {
      return
    }

    window.postMessage(
      {
        source: PAGE_SOURCE,
        type: 'PAGE_CONTEXT_BRIDGE',
        devtoolsConfig: window.__RAG_DEVTOOLS_CONFIG__ || window.__BEAM_DEVTOOLS_CONFIG__ || null,
        firebaseUser: window.__RAG_AUTH_USER__ || window.__BEAM_AUTH_USER__ || null,
        pageDebug: window.__RAG_PAGE_DEBUG__ || window.__BEAM_PAGE_DEBUG__ || null,
      },
      '*'
    )
  })
})()
