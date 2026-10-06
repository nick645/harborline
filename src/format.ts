export function coins(n: number): string {
  return `${n < 0 ? '−' : ''}${Math.abs(Math.round(n)).toLocaleString('en-US')}`
}

export function duration(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (h > 0) return `${h}h ${m}m`
  return `${m}:${String(s).padStart(2, '0')}`
}
