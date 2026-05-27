// ── Primitivas ────────────────────────────────────────────────────────────────

/**
 * SkeletonBlock — retângulo animado genérico
 * @param {string} className  — classes Tailwind extras (ex: "h-4 w-32 rounded")
 */
export function SkeletonBlock({ className = '' }) {
  return (
    <div
      className={`skeleton-pulse bg-slate-200 dark:bg-slate-700 rounded-xl ${className}`}
    />
  )
}

/**
 * SkeletonLine — linha de texto simulada
 * @param {string} width  — classe de largura (ex: "w-3/4", "w-full")
 */
export function SkeletonLine({ width = 'w-full', className = '' }) {
  return (
    <div
      className={`skeleton-pulse h-3.5 bg-slate-200 dark:bg-slate-700 rounded-full ${width} ${className}`}
    />
  )
}

// ── Card genérico ─────────────────────────────────────────────────────────────

export function SkeletonCard({ className = '' }) {
  return (
    <div className={`card p-5 flex flex-col gap-3 ${className}`}>
      <SkeletonLine width="w-1/3" />
      <SkeletonLine width="w-full" />
      <SkeletonLine width="w-5/6" />
      <SkeletonLine width="w-2/3" />
    </div>
  )
}

// ── Stats strip ───────────────────────────────────────────────────────────────

export function SkeletonStats({ count = 4 }) {
  return (
    <div
      className="mb-4"
      style={{ display: 'grid', gridTemplateColumns: `repeat(${count}, 1fr)`, gap: '1rem' }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card p-4 flex items-center gap-3">
          <SkeletonBlock className="h-9 w-9 flex-shrink-0" />
          <div className="flex-1 flex flex-col gap-2">
            <SkeletonLine width="w-2/3" />
            <SkeletonLine width="w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Dashboard completo ────────────────────────────────────────────────────────

export function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-4 animate-pulse-once">
      {/* Stats */}
      <SkeletonStats count={4} />

      {/* Linha principal: rotina + financeiro */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SkeletonCard />
        <SkeletonCard />
      </div>

      {/* Linha: estudos + metas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SkeletonCard />
        <SkeletonCard />
      </div>

      {/* Linha: concurso */}
      <SkeletonCard />
    </div>
  )
}
