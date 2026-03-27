import { withBase } from '../../lib/base-path'

export function OrderLoadingState({ label = 'Loading order details...' }: { label?: string }) {
  return <StateCard tone="muted" title="Loading" body={label} />
}

export function OrderErrorState({ message }: { message: string }) {
  return <StateCard tone="danger" title="Something went wrong" body={message} />
}

export function OrderEmptyState({
  title,
  body,
  actionLabel = 'Back to menu',
  actionHref = '/menu',
}: {
  title: string
  body: string
  actionLabel?: string
  actionHref?: string
}) {
  return (
    <div className="rounded-[28px] border border-[rgba(106,45,31,0.12)] bg-white p-6 shadow-[0_18px_38px_rgba(31,25,21,0.08)]">
      <h2 className="font-western text-[28px] text-[var(--cocoa)]">{title}</h2>
      <p className="mt-3 max-w-[48ch] text-[15px] leading-[1.7] text-[var(--muted)]">{body}</p>
      <a
        href={withBase(actionHref)}
        className="mt-5 inline-flex items-center justify-center rounded-full bg-[var(--red)] px-5 py-3 text-sm font-semibold text-white"
      >
        {actionLabel}
      </a>
    </div>
  )
}

function StateCard({
  title,
  body,
  tone,
}: {
  title: string
  body: string
  tone: 'muted' | 'danger'
}) {
  return (
    <div
      className={[
        'rounded-[28px] border bg-white p-6 shadow-[0_18px_38px_rgba(31,25,21,0.08)]',
        tone === 'danger' ? 'border-[rgba(185,49,47,0.22)]' : 'border-[rgba(106,45,31,0.12)]',
      ].join(' ')}
    >
      <div className="inline-flex rounded-full bg-[var(--paper)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--brick)]">
        Frankie's order flow
      </div>
      <h2 className={['mt-4 font-western text-[28px]', tone === 'danger' ? 'text-[var(--red)]' : 'text-[var(--cocoa)]'].join(' ')}>
        {title}
      </h2>
      <p className="mt-3 text-[15px] leading-[1.7] text-[var(--muted)]">{body}</p>
      {tone === 'muted' ? <div className="mt-5 h-2 w-28 rounded-full bg-[var(--paper)]" /> : null}
    </div>
  )
}
