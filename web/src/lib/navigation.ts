const LOCATION_CHANGE_EVENT = 'frankies:locationchange'

type NavigateOptions = {
  replace?: boolean
  scroll?: boolean
}

export function getLocationChangeEventName() {
  return LOCATION_CHANGE_EVENT
}

export function navigateTo(path: string, options: NavigateOptions = {}) {
  if (typeof window === 'undefined') {
    return
  }

  const target = path || '/'
  const method = options.replace ? 'replaceState' : 'pushState'
  window.history[method](window.history.state, '', target)
  window.dispatchEvent(new Event(LOCATION_CHANGE_EVENT))

  if (options.scroll !== false) {
    window.scrollTo({ top: 0 })
  }
}

export function getCurrentSearchParams() {
  if (typeof window === 'undefined') {
    return new URLSearchParams()
  }

  return new URLSearchParams(window.location.search)
}
