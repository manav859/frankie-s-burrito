import type { MenuCategory } from '../../features/ordering/types'

export function CategoryTabs({
  categories,
  selectedCategory,
  onSelect,
  orientation = 'horizontal',
}: {
  categories: MenuCategory[]
  selectedCategory: string
  onSelect: (categorySlug: string) => void
  orientation?: 'horizontal' | 'vertical'
}) {
  const vertical = orientation === 'vertical'

  return (
    <div
      className={[
        vertical
          ? 'flex flex-col gap-2'
          : 'flex w-full min-w-0 gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
      ].join(' ')}
    >
      {categories.map((category) => {
        const active = category.slug === selectedCategory

        return (
          <button
            key={category.id}
            type="button"
            onClick={() => onSelect(category.slug)}
            className={[
              vertical
                ? 'w-full rounded-[18px] border px-4 py-3 text-left text-sm font-semibold transition'
                : 'min-w-fit shrink-0 rounded-full border px-4 py-2.5 text-center text-sm font-semibold transition',
              active
                ? vertical
                  ? 'border-[var(--red)] bg-[var(--red)] text-white shadow-[0_14px_24px_rgba(185,49,47,0.18)]'
                  : 'border-[var(--red)] bg-[var(--red)] text-white shadow-[0_10px_18px_rgba(185,49,47,0.18)]'
                : vertical
                  ? 'border-[rgba(106,45,31,0.1)] bg-[rgba(255,255,255,0.7)] text-[var(--muted)] hover:border-[var(--gold)] hover:bg-white hover:text-[var(--cocoa)]'
                  : 'border-[rgba(106,45,31,0.12)] bg-white text-[var(--muted)] hover:border-[var(--gold)] hover:text-[var(--cocoa)]',
            ].join(' ')}
          >
            <span className="block">{category.name}</span>
            {vertical ? (
              <span className={['mt-1 block text-xs', active ? 'text-[rgba(255,255,255,0.8)]' : 'text-[var(--muted)]'].join(' ')}>
                {category.count} items
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
