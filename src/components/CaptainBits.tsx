import type { CaptainView } from '../game/captains'

/** The anchor glyph forced to text style, so it takes the colour we give it instead of emoji colours. */
export const ANCHOR = '\u2693\uFE0E'

export function Anchors({ n }: { n: number }) {
  return (
    <span className="anchors" aria-label={`Reputation ${n} of 5`} title={`Reputation ${n} of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i <= n ? 'on' : 'off'}>
          {ANCHOR}
        </span>
      ))}
    </span>
  )
}

/** Where the captain's skill lies, as far as anyone knows. Never a single number. */
export function SkillRange({ band }: { band: [number, number] }) {
  const [lo, hi] = band
  const unknown = lo <= 1 && hi >= 100
  return (
    <div className="skill-range" title={unknown ? 'Skill unknown' : `Skill somewhere between ${lo} and ${hi}`}>
      <span className="small muted">Skill</span>
      <div className="skill-track">
        <div className={`skill-band ${unknown ? 'unknown' : ''}`} style={{ left: `${lo - 1}%`, width: `${Math.max(2, hi - lo + 1)}%` }} />
        <div className="skill-mid" />
      </div>
      <span className="small">{unknown ? '?' : `${lo}–${hi}`}</span>
    </div>
  )
}

const VERDICT: Record<NonNullable<CaptainView['verdict']>, { label: string; note: string }> = {
  sleeper: { label: 'Sleeper', note: 'Better than their reputation' },
  'all-talk': { label: 'All talk', note: 'Not as good as people say' },
  'true-to-form': { label: 'True to form', note: 'About as good as their reputation' },
}

export function VerdictBadge({ verdict }: { verdict: CaptainView['verdict'] }) {
  if (!verdict) return null
  const v = VERDICT[verdict]
  return (
    <span className={`verdict ${verdict}`} title={v.note}>
      {v.label}
    </span>
  )
}

export function TraitList({ c }: { c: CaptainView }) {
  if (c.traits.length === 0) return <p className="muted small">Nobody knows much about them yet.</p>
  return (
    <ul className="trait-list">
      {c.traits.map((t) => (
        <li key={t.id} className={t.status}>
          {t.status === 'proven' && (
            <>
              <strong>✓ {t.name}</strong> <span className="muted">{t.description}</span>
            </>
          )}
          {t.status === 'rumour' && (
            <>
              <span className="muted">Rumour:</span> “{t.rumour}”
            </>
          )}
          {t.status === 'disproven' && (
            <>
              <s>“{t.rumour}”</s> <span className="muted">Not true, as it turns out</span>
            </>
          )}
        </li>
      ))}
    </ul>
  )
}
