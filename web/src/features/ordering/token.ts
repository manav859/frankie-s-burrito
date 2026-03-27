const CART_TOKEN_KEY = 'frankies-headless-cart-token:v1'

function getStorage() {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    return window.localStorage
  } catch {
    return null
  }
}

export function readCartToken() {
  const storage = getStorage()
  return storage?.getItem(CART_TOKEN_KEY) || ''
}

export function writeCartToken(cartToken: string) {
  const storage = getStorage()
  if (!storage) {
    return
  }

  if (!cartToken) {
    storage.removeItem(CART_TOKEN_KEY)
    return
  }

  storage.setItem(CART_TOKEN_KEY, cartToken)
}

export function clearCartToken() {
  writeCartToken('')
}

export function persistCartTokenFromResponse(payload: unknown) {
  if (!payload || typeof payload !== 'object') {
    return ''
  }

  const candidate = payload as { cart_token?: unknown; cart?: { cart_token?: unknown } }
  const hasRootToken = Object.prototype.hasOwnProperty.call(candidate, 'cart_token')
  const hasNestedToken = !!candidate.cart && Object.prototype.hasOwnProperty.call(candidate.cart, 'cart_token')
  const cartToken = hasRootToken
    ? typeof candidate.cart_token === 'string'
      ? candidate.cart_token
      : ''
    : hasNestedToken
      ? typeof candidate.cart?.cart_token === 'string'
        ? candidate.cart.cart_token
        : ''
      : null

  if (cartToken !== null) {
    writeCartToken(cartToken)
  }

  return cartToken || ''
}
