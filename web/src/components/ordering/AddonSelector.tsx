import { getMoneyRawValue } from '../../features/ordering/helpers'
import type { CartSelectedAddOn, MenuAddonGroup } from '../../features/ordering/types'

export function AddonSelector({
  groups,
  selectedAddons,
  onToggle,
}: {
  groups: MenuAddonGroup[]
  selectedAddons: CartSelectedAddOn[]
  onToggle: (groupIndex: number, optionKey: string) => void
}) {
  return (
    <>
      {groups.map((group, groupIndex) => (
        <fieldset key={group.key} className="rounded-[24px] border border-[rgba(106,45,31,0.1)] bg-white p-5">
          <legend className="w-full px-1">
            <div className="flex items-center justify-between gap-3">
              <span className="font-western text-[24px] text-[var(--cocoa)]">{group.label}</span>
              <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
                {group.required ? 'Required' : group.max > 0 ? `Up to ${group.max}` : 'Optional'}
              </span>
            </div>
          </legend>

          <div className="mt-4 space-y-3">
            {group.options.map((option) => {
              const active = selectedAddons.some((addon) => addon.group_id === group.key && addon.option_id === option.key)
              const selectedInGroup = selectedAddons.filter((addon) => addon.group_id === group.key).length
              const disabled = !active && group.type !== 'single' && group.max > 0 && selectedInGroup >= group.max
              const hasPrice = getMoneyRawValue(option.price_adjustment) > 0

              return (
                <label
                  key={option.key}
                  className={[
                    'flex items-center justify-between gap-3 rounded-[18px] border px-4 py-3 transition',
                    active ? 'border-[var(--red)] bg-[rgba(185,49,47,0.04)]' : 'border-[rgba(106,45,31,0.12)] bg-[var(--paper)]',
                    disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
                  ].join(' ')}
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <input
                      type={group.type === 'single' ? 'radio' : 'checkbox'}
                      name={group.key}
                      checked={active}
                      disabled={disabled}
                      onChange={() => onToggle(groupIndex, option.key)}
                    />
                    <span className="text-sm font-medium text-[var(--cocoa)]">{option.label}</span>
                  </span>
                  <span className="text-sm font-semibold text-[var(--red)]">{hasPrice ? `+ ${option.price_adjustment.formatted}` : 'Included'}</span>
                </label>
              )
            })}
          </div>
        </fieldset>
      ))}
    </>
  )
}
