// The shared game logic copies state with structuredClone. Some JS engines on phones don't
// have it yet; game state is plain JSON (no Dates, Maps or functions), so a JSON round-trip
// is an exact substitute.
if (typeof globalThis.structuredClone !== 'function') {
  globalThis.structuredClone = (<T>(value: T): T => JSON.parse(JSON.stringify(value))) as typeof structuredClone
}

export {}
