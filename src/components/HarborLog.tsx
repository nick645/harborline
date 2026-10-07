import type { LogEntry } from '../game/types'
import { duration } from '../format'

const SHOWN = 8

export function HarborLog({ log, now }: { log: LogEntry[]; now: number }) {
  if (log.length === 0) return null
  return (
    <section className="harbor-log">
      <h2>Harbor log</h2>
      <ul>
        {log.slice(0, SHOWN).map((e, i) => (
          <li key={`${e.at}-${i}`} className={e.kind}>
            <span className="muted small">{duration(now - e.at)} ago</span> {e.text}
          </li>
        ))}
      </ul>
    </section>
  )
}
