import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { buildAddToCartPayload, getItemAddonGroups, getItemDescription, getItemSizeOptions, type CustomizableMenuItem } from '../../features/ordering/customization'
import { moneyFromRaw } from '../../features/ordering/helpers'
import { useCustomizeItemState } from '../../features/ordering/useCustomizeItemState'
import type { AddToCartInput, CartItem } from '../../features/ordering/types'
import { CmsImage } from '../ui/CmsImage'
import { AddonSelector } from './AddonSelector'
import { QuantityControl } from './QuantityControl'
import { SizeSelector } from './SizeSelector'

type CustomizeModalProps = {
  item: CustomizableMenuItem | null
  open: boolean
  existingCartItem?: CartItem | null
  onClose: () => void
  onConfirm: (input: AddToCartInput, cartKey?: string) => Promise<void> | void
}

function ModalContainer({
  children,
  onClose,
}: {
  children: React.ReactNode
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center overflow-hidden bg-black/40 backdrop-blur-sm motion-safe:animate-[modal-overlay-in_180ms_ease-out] sm:p-4">
      <button type="button" aria-label="Close customization modal" className="absolute inset-0" onClick={onClose} />
      {children}
    </div>
  )
}

function ModalSheet({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative z-10 flex max-h-[90vh] w-screen min-w-0 max-w-screen flex-col overflow-hidden rounded-t-2xl bg-white shadow-[0_-24px_52px_rgba(31,25,21,0.18)] motion-safe:animate-[modal-sheet-up_240ms_cubic-bezier(0.16,1,0.3,1)] sm:w-full sm:max-w-md sm:rounded-2xl">
      {children}
    </div>
  )
}

function ModalHeader({
  title,
  onClose,
}: {
  title: string
  onClose: () => void
}) {
  return (
    <div className="shrink-0 border-b border-[rgba(106,45,31,0.08)] p-4 sm:px-5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--orange)]">Customize item</div>
          <h2 className="truncate text-lg font-semibold text-[var(--cocoa)]">{title}</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[rgba(106,45,31,0.12)] bg-white text-[var(--brick)]"
        >
          x
        </button>
      </div>
    </div>
  )
}

function ModalContent({ children }: { children: React.ReactNode }) {
  return <div className="min-h-0 flex-1 overflow-y-auto p-4 space-y-4 sm:p-5">{children}</div>
}

function ModalFooter({
  total,
  actionLabel,
  disabled,
  onConfirm,
}: {
  total: string
  actionLabel: string
  disabled: boolean
  onConfirm: () => void
}) {
  return (
    <div className="shrink-0 border-t border-[rgba(106,45,31,0.08)] bg-white px-4 pb-4 pt-4 sm:px-5">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">Total</div>
          <div className="text-lg font-semibold text-[var(--cocoa)]">{total}</div>
        </div>
        <button
          type="button"
          onClick={onConfirm}
          disabled={disabled}
          className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-black/50"
        >
          {actionLabel}
        </button>
      </div>
    </div>
  )
}

export function CustomizeModal({ item, open, existingCartItem, onClose, onConfirm }: CustomizeModalProps) {
  const [submitting, setSubmitting] = useState(false)
  const {
    quantity,
    setQuantity,
    selectedSize,
    setSelectedSize,
    selectedAddons,
    notes,
    setNotes,
    validationError,
    finalPrice,
    toggleAddon,
    validate,
  } = useCustomizeItemState(item, existingCartItem)

  useEffect(() => {
    if (!open) {
      return
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleEscape)
    document.body.style.overflow = 'hidden'

    return () => {
      window.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [onClose, open])

  if (!item || !open) {
    return null
  }

  const description = getItemDescription(item)
  const sizeOptions = getItemSizeOptions(item)
  const addonGroups = getItemAddonGroups(item)
  const basePrice = moneyFromRaw(item.base_price, finalPrice?.currency || 'USD')
  const total = moneyFromRaw((Number(finalPrice?.raw || '0') || 0) * quantity, finalPrice?.currency || 'USD').formatted
  const actionLabel = submitting ? 'Saving...' : existingCartItem ? 'Update cart item' : 'Add to cart'

  const handleConfirm = async () => {
    if (!validate()) {
      return
    }

    setSubmitting(true)

    try {
      await onConfirm(
        buildAddToCartPayload(item, quantity, {
          selectedSize,
          selectedAddons,
          notes,
        }),
        existingCartItem?.key,
      )
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  const modal = (
    <ModalContainer onClose={onClose}>
      <ModalSheet>
        <ModalHeader title={item.name} onClose={onClose} />

        <ModalContent>
          {validationError ? (
            <div className="rounded-lg border border-[rgba(185,49,47,0.16)] bg-[rgba(185,49,47,0.06)] px-3 py-2 text-sm font-medium text-[var(--red)]">
              {validationError}
            </div>
          ) : null}

          <div className="overflow-hidden rounded-lg bg-[var(--paper)]">
            {item.image ? (
              <CmsImage
                src={item.image}
                media={item.image_data}
                alt={item.image_alt || item.name}
                className="block h-52 w-full object-cover sm:h-56"
                sizes="(min-width: 640px) 28rem, 100vw"
                priority
              />
            ) : (
              <div className="flex h-52 w-full items-center justify-center bg-[var(--paper)] text-sm text-[var(--muted)] sm:h-56">No image yet</div>
            )}
          </div>

          <div className="rounded-xl bg-gray-100 p-4">
            <p className="text-sm text-gray-500">Base price</p>
            <p className="text-lg font-semibold text-[var(--cocoa)]">{basePrice.formatted}</p>
            {description ? <p className="mt-2 text-sm leading-[1.6] text-[var(--muted)]">{description}</p> : null}
          </div>

          <SizeSelector options={sizeOptions} selected={selectedSize} onChange={setSelectedSize} />

          <AddonSelector groups={addonGroups} selectedAddons={selectedAddons} onToggle={toggleAddon} />

          <div className="space-y-2">
            <label htmlFor="customize-notes" className="text-sm font-medium text-[var(--cocoa)]">
              Allergies / notes
            </label>
            <textarea
              id="customize-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={4}
              className="w-full rounded-lg border p-3 text-base leading-[1.6] text-[var(--cocoa)] outline-none transition focus:border-[var(--red)]"
              placeholder="Add allergies, preferences, or special instructions"
            />
          </div>

          <div className="space-y-3 rounded-xl bg-gray-100 p-4">
            <p className="text-sm text-gray-500">Quantity</p>
            <QuantityControl value={quantity} onChange={setQuantity} />
          </div>
        </ModalContent>

        <ModalFooter total={total} actionLabel={actionLabel} disabled={submitting || item.availability !== 'available'} onConfirm={() => void handleConfirm()} />
      </ModalSheet>
    </ModalContainer>
  )

  return typeof document === 'undefined' ? modal : createPortal(modal, document.body)
}
