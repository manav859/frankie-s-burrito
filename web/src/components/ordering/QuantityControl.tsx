export function QuantityControl({
  value,
  min = 1,
  onChange,
}: {
  value: number
  min?: number
  onChange: (nextValue: number) => void
}) {
  return (
    <div className="inline-flex items-center gap-3 rounded-full border border-[rgba(106,45,31,0.14)] bg-white px-3 py-2">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        className="flex h-7 w-7 items-center justify-center rounded-full border border-[rgba(106,45,31,0.14)] text-[var(--brick)]"
        aria-label="Decrease quantity"
      >
        -
      </button>
      <span className="min-w-6 text-center text-sm font-semibold text-[var(--cocoa)]">{value}</span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        className="flex h-7 w-7 items-center justify-center rounded-full border border-[rgba(106,45,31,0.14)] text-[var(--brick)]"
        aria-label="Increase quantity"
      >
        +
      </button>
    </div>
  )
}
