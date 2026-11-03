/** Moves focus to the page's main content: its heading if it has one. */
export function focusMain(scroll = false) {
  const main = document.querySelector<HTMLElement>('main')
  const target = main?.querySelector<HTMLElement>('h1') ?? main
  if (!target) return false
  if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1')
  target.focus({ preventScroll: !scroll })
  return true
}
