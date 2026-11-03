// One polite live region for the whole app: screen readers read out what changed
// ("Added Cold Brew. 3 items in your cart.") without moving focus.

let region: HTMLElement | null = null
let timer = 0

function getRegion() {
  if (region?.isConnected) return region
  region = document.createElement('div')
  region.setAttribute('aria-live', 'polite')
  region.setAttribute('aria-atomic', 'true')
  region.className = 'sr-only'
  document.body.appendChild(region)
  return region
}

export function announce(message: string) {
  const el = getRegion()
  // Clear first so the same message twice in a row is still read
  el.textContent = ''
  window.clearTimeout(timer)
  timer = window.setTimeout(() => { el.textContent = message }, 60)
}
