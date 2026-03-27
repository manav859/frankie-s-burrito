import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  addToCart,
  clearPersistedCartToken,
  clearCart,
  getCart,
  hasOrderingApiBase,
  placeOrder,
  removeCartItem,
  updateCartItem,
  validateCheckout,
} from './api'
import type { AddToCartInput, CartResponse, CheckoutInput, CheckoutValidationResponse, PlaceOrderResponse } from './types'

type CartMutation =
  | { type: 'idle' }
  | { type: 'refresh' }
  | { type: 'add' }
  | { type: 'update'; key: string }
  | { type: 'remove'; key: string }
  | { type: 'clear' }
  | { type: 'checkout' }

type CartContextValue = {
  cart: CartResponse | null
  ready: boolean
  loading: boolean
  error: string | null
  hasApi: boolean
  mutation: CartMutation
  refreshCart: () => Promise<CartResponse | null>
  addItem: (input: AddToCartInput) => Promise<CartResponse>
  updateItemQuantity: (key: string, quantity: number) => Promise<CartResponse>
  removeItem: (key: string) => Promise<CartResponse>
  clearAllItems: () => Promise<CartResponse>
  validateCurrentCheckout: (input: CheckoutInput) => Promise<CheckoutValidationResponse>
  submitOrder: (input: CheckoutInput) => Promise<PlaceOrderResponse>
}

const CartContext = createContext<CartContextValue | null>(null)

function createEmptyMoney(currency = 'USD') {
  return {
    raw: '0.00',
    formatted: '$0.00',
    currency,
    symbol: '$',
  }
}

function createEmptyCart(currency = 'USD'): CartResponse {
  return {
    cart_token: '',
    items: [],
    item_count: 0,
    subtotal: createEmptyMoney(currency),
    taxes: createEmptyMoney(currency),
    fees: createEmptyMoney(currency),
    total: createEmptyMoney(currency),
    currency,
    available_upsells: [],
  }
}

function sumItemCount(items: CartResponse['items']) {
  return items.reduce((total, item) => total + item.quantity, 0)
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartResponse | null>(null)
  const [ready, setReady] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mutation, setMutation] = useState<CartMutation>({ type: 'idle' })
  const mountedRef = useRef(true)
  const hasApi = hasOrderingApiBase()

  useEffect(() => {
    return () => {
      mountedRef.current = false
    }
  }, [])

  const refreshCart = useCallback(async () => {
    if (!hasApi) {
      const emptyCart = createEmptyCart()
      if (mountedRef.current) {
        setCart(emptyCart)
        setReady(true)
        setError(null)
        setMutation({ type: 'idle' })
      }
      return emptyCart
    }

    setLoading(true)
    setMutation({ type: 'refresh' })

    try {
      const nextCart = await getCart()
      if (mountedRef.current) {
        setCart(nextCart)
        setError(null)
      }
      return nextCart
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : 'Unable to load your cart.'
      if (mountedRef.current) {
        setError(message)
      }
      return null
    } finally {
      if (mountedRef.current) {
        setLoading(false)
        setReady(true)
        setMutation({ type: 'idle' })
      }
    }
  }, [hasApi])

  useEffect(() => {
    void refreshCart()
  }, [refreshCart])

  const runCartMutation = useCallback(async (request: Promise<CartResponse>, nextMutation: CartMutation) => {
    setLoading(true)
    setMutation(nextMutation)

    try {
      const nextCart = await request
      if (mountedRef.current) {
        setCart(nextCart)
        setError(null)
      }
      return nextCart
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : 'Unable to update your cart.'
      if (mountedRef.current) {
        setError(message)
      }
      throw caughtError
    } finally {
      if (mountedRef.current) {
        setLoading(false)
        setMutation({ type: 'idle' })
      }
    }
  }, [])

  const applyOptimisticQuantity = useCallback((currentCart: CartResponse | null, key: string, quantity: number) => {
    if (!currentCart) {
      return null
    }

    const nextItems = currentCart.items
      .map((item) => (item.key === key ? { ...item, quantity, summary_lines: item.summary_lines } : item))
      .filter((item) => item.quantity > 0)

    return {
      ...currentCart,
      items: nextItems,
      item_count: sumItemCount(nextItems),
    }
  }, [])

  const updateItemQuantity = useCallback(
    async (key: string, quantity: number) => {
      const previousCart = cart
      const optimisticCart = applyOptimisticQuantity(previousCart, key, quantity)

      if (optimisticCart && mountedRef.current) {
        setCart(optimisticCart)
      }

      try {
        return await runCartMutation(updateCartItem({ key, quantity }), quantity === 0 ? { type: 'remove', key } : { type: 'update', key })
      } catch (caughtError) {
        if (mountedRef.current && previousCart) {
          setCart(previousCart)
        }
        throw caughtError
      }
    },
    [applyOptimisticQuantity, cart, runCartMutation],
  )

  const removeItem = useCallback(
    async (key: string) => {
      const previousCart = cart
      const optimisticCart = applyOptimisticQuantity(previousCart, key, 0)

      if (optimisticCart && mountedRef.current) {
        setCart(optimisticCart)
      }

      try {
        return await runCartMutation(removeCartItem(key), { type: 'remove', key })
      } catch (caughtError) {
        if (mountedRef.current && previousCart) {
          setCart(previousCart)
        }
        throw caughtError
      }
    },
    [applyOptimisticQuantity, cart, runCartMutation],
  )

  const clearAllItems = useCallback(async () => {
    const previousCart = cart

    if (previousCart && mountedRef.current) {
      setCart(createEmptyCart(previousCart.currency))
    }

    try {
      return await runCartMutation(clearCart(), { type: 'clear' })
    } catch (caughtError) {
      if (mountedRef.current && previousCart) {
        setCart(previousCart)
      }
      throw caughtError
    }
  }, [cart, runCartMutation])

  const value = useMemo<CartContextValue>(
    () => ({
      cart,
      ready,
      loading,
      error,
      hasApi,
      mutation,
      refreshCart,
      addItem: async (input) => runCartMutation(addToCart(input), { type: 'add' }),
      updateItemQuantity,
      removeItem,
      clearAllItems,
      validateCurrentCheckout: async (input) =>
        validateCheckout({
          ...input,
          cart_items: cart?.items || [],
        } as typeof input & { cart_items: CartResponse['items'] }),
      submitOrder: async (input) => {
        setLoading(true)
        setMutation({ type: 'checkout' })

        try {
          const response = await placeOrder({
            ...input,
            cart_items: cart?.items || [],
          } as typeof input & { cart_items: CartResponse['items'] })
          clearPersistedCartToken()
          if (mountedRef.current) {
            setCart(createEmptyCart(cart?.currency || 'USD'))
          }
          if (mountedRef.current) {
            setError(null)
          }
          return response
        } catch (caughtError) {
          const message = caughtError instanceof Error ? caughtError.message : 'Unable to place your order.'
          if (mountedRef.current) {
            setError(message)
          }
          throw caughtError
        } finally {
          if (mountedRef.current) {
            setLoading(false)
            setMutation({ type: 'idle' })
          }
        }
      },
    }),
    [cart, clearAllItems, error, hasApi, loading, mutation, ready, removeItem, runCartMutation, updateItemQuantity],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const context = useContext(CartContext)

  if (!context) {
    throw new Error('useCart must be used within a CartProvider.')
  }

  return context
}
