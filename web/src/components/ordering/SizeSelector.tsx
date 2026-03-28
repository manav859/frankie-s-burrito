import { getMoneyRawValue } from '../../features/ordering/helpers'
import type { CartSelectedOption, MenuSpiceOption } from '../../features/ordering/types'

export function SizeSelector({
  options,
  selected,
  onChange,
}: {
  options: MenuSpiceOption[]
  selected: CartSelectedOption | null
  onChange: (option: CartSelectedOption) => void
}) {
  if (!options.length) {
    return null
  }

  return (
    <fieldset className="rounded-[24px] border border-[rgba(106,45,31,0.1)] bg-white p-5">
      <legend className="px-1 font-western text-[24px] text-[var(--cocoa)]">Choose your size</legend>
      <div className="mt-4 space-y-3">
        {options.map((option) => {
          const active = selected?.key === option.key
          const optionPrice = typeof option.price_adjustment === 'object' ? option.price_adjustment : null
          const hasPrice = getMoneyRawValue(optionPrice) > 0

          return (
            <label
              key={option.key}
              className={[
                'flex cursor-pointer items-center justify-between gap-3 rounded-[18px] border px-4 py-3 transition',
                active ? 'border-[var(--red)] bg-[rgba(185,49,47,0.04)]' : 'border-[rgba(106,45,31,0.12)] bg-[var(--paper)]',
              ].join(' ')}
            >
              <span className="flex min-w-0 items-center gap-3">
                <input
                  type="radio"
                  name="item-size"
                  checked={active}
                  onChange={() =>
                    onChange({
                      key: option.key,
                      label: option.label,
                      price_adjustment: optionPrice || { raw: '0.00', formatted: '$0.00', currency: 'USD', symbol: '$' },
                    })
                  }
                />
                <span className="text-sm font-medium text-[var(--cocoa)]">{option.label}</span>
              </span>
              <span className="text-sm font-semibold text-[var(--red)]">{hasPrice && optionPrice ? `+ ${optionPrice.formatted}` : 'Included'}</span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
