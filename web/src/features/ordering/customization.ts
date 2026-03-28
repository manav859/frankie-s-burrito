import { getMoneyRawValue, moneyFromRaw } from './helpers'
import type {
  AddToCartInput,
  CartItem,
  CartSelectedAddOn,
  ItemCustomizationSelection,
  MenuAddonGroup,
  MenuItemCard,
  MenuItemDetail,
} from './types'

export type CustomizableMenuItem = MenuItemCard | MenuItemDetail

export function getItemDescription(item: CustomizableMenuItem) {
  if ('description' in item && typeof item.description === 'string' && item.description.trim()) {
    return item.description.trim()
  }

  return item.short_description?.trim() || ''
}

export function getItemSizeOptions(item: CustomizableMenuItem) {
  return item.spice_options || []
}

export function getItemAddonGroups(item: CustomizableMenuItem) {
  if ('addon_groups' in item && Array.isArray(item.addon_groups) && item.addon_groups.length) {
    return item.addon_groups
  }

  return item.add_on_groups || []
}

export function getInitialCustomizationSelection(
  _item: CustomizableMenuItem,
  existingCartItem?: CartItem | null,
): ItemCustomizationSelection {
  return {
    selectedSize: existingCartItem?.selected_size || null,
    selectedAddons: existingCartItem?.addons || [],
    notes: existingCartItem?.notes || existingCartItem?.allergies_note || '',
  }
}

export function calculateItemFinalPrice(
  item: CustomizableMenuItem,
  selection: Pick<ItemCustomizationSelection, 'selectedSize' | 'selectedAddons'>,
) {
  const currency = item.price ? moneyFromRaw(item.price).currency : moneyFromRaw(item.base_price).currency
  const basePrice = getMoneyRawValue(moneyFromRaw(item.base_price, currency))
  const sizePrice = getMoneyRawValue(selection.selectedSize?.price_adjustment)
  const addonsPrice = selection.selectedAddons.reduce((total, addon) => total + getMoneyRawValue(addon.price), 0)

  return moneyFromRaw(basePrice + sizePrice + addonsPrice, currency)
}

export function validateCustomizationSelection(item: CustomizableMenuItem, selection: ItemCustomizationSelection) {
  const sizeOptions = getItemSizeOptions(item)

  if (sizeOptions.length && !selection.selectedSize) {
    return 'Choose a size before adding this item.'
  }

  const groups = getItemAddonGroups(item)

  for (const group of groups) {
    const activeCount = selection.selectedAddons.filter((addon) => addon.group_id === group.key).length
    const minimumRequired = Math.max(group.min, group.required ? 1 : 0)

    if (minimumRequired > 0 && activeCount < minimumRequired) {
      return `Choose at least ${minimumRequired} option${minimumRequired === 1 ? '' : 's'} for ${group.label}.`
    }

    if (group.max > 0 && activeCount > group.max) {
      return `Choose no more than ${group.max} option${group.max === 1 ? '' : 's'} for ${group.label}.`
    }
  }

  return null
}

export function toggleAddonSelection(
  currentAddons: CartSelectedAddOn[],
  group: MenuAddonGroup,
  option: MenuAddonGroup['options'][number],
) {
  const activeInGroup = currentAddons.filter((addon) => addon.group_id === group.key)
  const alreadySelected = activeInGroup.some((addon) => addon.option_id === option.key)

  if (group.type === 'single') {
    if (alreadySelected) {
      return currentAddons.filter((addon) => addon.group_id !== group.key)
    }

    return [
      ...currentAddons.filter((addon) => addon.group_id !== group.key),
      {
        group_id: group.key,
        option_id: option.key,
        name: option.label,
        price: option.price_adjustment,
      },
    ]
  }

  if (alreadySelected) {
    return currentAddons.filter((addon) => !(addon.group_id === group.key && addon.option_id === option.key))
  }

  if (group.max > 0 && activeInGroup.length >= group.max) {
    return currentAddons
  }

  return [
    ...currentAddons,
    {
      group_id: group.key,
      option_id: option.key,
      name: option.label,
      price: option.price_adjustment,
    },
  ]
}

export function buildAddToCartPayload(
  item: CustomizableMenuItem,
  quantity: number,
  selection: ItemCustomizationSelection,
): AddToCartInput {
  const finalPrice = calculateItemFinalPrice(item, selection)

  return {
    item_id: item.id,
    product_id: item.id,
    slug: item.slug,
    name: item.name,
    image: item.image,
    image_data: item.image_data,
    base_price: moneyFromRaw(item.base_price, finalPrice.currency),
    final_price: finalPrice,
    quantity,
    fulfillment_mode: item.fulfillment_mode,
    size: selection.selectedSize,
    spice_level: selection.selectedSize,
    addons: selection.selectedAddons,
    selected_add_ons: selection.selectedAddons,
    notes: selection.notes?.trim() || undefined,
    allergies_note: selection.notes?.trim() || undefined,
  }
}
