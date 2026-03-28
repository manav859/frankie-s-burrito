import { useEffect, useMemo, useState } from 'react'
import {
  calculateItemFinalPrice,
  getInitialCustomizationSelection,
  getItemAddonGroups,
  getItemSizeOptions,
  toggleAddonSelection,
  validateCustomizationSelection,
  type CustomizableMenuItem,
} from './customization'
import type { CartItem, CartSelectedOption } from './types'

export function useCustomizeItemState(item: CustomizableMenuItem | null, existingCartItem?: CartItem | null) {
  const [quantity, setQuantity] = useState(existingCartItem?.quantity || 1)
  const [selectedSize, setSelectedSize] = useState<CartSelectedOption | null>(existingCartItem?.selected_size || null)
  const [selectedAddons, setSelectedAddons] = useState(existingCartItem?.addons || [])
  const [notes, setNotes] = useState(existingCartItem?.notes || existingCartItem?.allergies_note || '')
  const [validationError, setValidationError] = useState<string | null>(null)

  useEffect(() => {
    if (!item) {
      return
    }

    const initialSelection = getInitialCustomizationSelection(item, existingCartItem)
    setQuantity(existingCartItem?.quantity || 1)
    setSelectedSize(initialSelection.selectedSize)
    setSelectedAddons(initialSelection.selectedAddons)
    setNotes(initialSelection.notes || '')
    setValidationError(null)
  }, [existingCartItem, item])

  const sizeOptions = useMemo(() => (item ? getItemSizeOptions(item) : []), [item])
  const addonGroups = useMemo(() => (item ? getItemAddonGroups(item) : []), [item])
  const finalPrice = useMemo(
    () => (item ? calculateItemFinalPrice(item, { selectedSize, selectedAddons }) : null),
    [item, selectedAddons, selectedSize],
  )

  return {
    quantity,
    setQuantity,
    selectedSize,
    setSelectedSize: (next: CartSelectedOption | null) => {
      setValidationError(null)
      setSelectedSize(next)
    },
    selectedAddons,
    setSelectedAddons,
    notes,
    setNotes,
    validationError,
    setValidationError,
    sizeOptions,
    addonGroups,
    finalPrice,
    toggleAddon: (groupIndex: number, optionKey: string) => {
      const group = addonGroups[groupIndex]
      const option = group?.options.find((entry) => entry.key === optionKey)

      if (!group || !option) {
        return
      }

      setValidationError(null)
      setSelectedAddons((current) => toggleAddonSelection(current, group, option))
    },
    validate: () => {
      if (!item) {
        return false
      }

      const error = validateCustomizationSelection(item, {
        selectedSize,
        selectedAddons,
        notes,
      })

      setValidationError(error)
      return !error
    },
    resetValidation: () => setValidationError(null),
  }
}
