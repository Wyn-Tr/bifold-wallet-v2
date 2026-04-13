import type { StateDef, TransitionDef } from '@ajna-inc/workflow'

/**
 * Compute a stable linear ordering of workflow states for progress display.
 *
 * Uses BFS from the `start` state along forward transitions (self-loops and
 * already-visited targets are skipped). Any states not reachable from the
 * start are appended at the end so every template state has a position.
 *
 * For `student_card.json` this yields:
 *   [main_menu, proposed, offered, issued, verifying, completed]
 */
export function orderStatesForProgress(
  states: readonly StateDef[],
  transitions: readonly TransitionDef[]
): string[] {
  if (!states || states.length === 0) return []

  const byName = new Map<string, StateDef>()
  for (const s of states) byName.set(s.name, s)

  // Adjacency list: from -> [to, to, ...] (self-loops stripped)
  const adj = new Map<string, string[]>()
  for (const t of transitions ?? []) {
    if (t.from === t.to) continue
    const list = adj.get(t.from) ?? []
    if (!list.includes(t.to)) list.push(t.to)
    adj.set(t.from, list)
  }

  const startState = states.find((s) => s.type === 'start') ?? states[0]
  const ordered: string[] = []
  const seen = new Set<string>()
  const queue: string[] = [startState.name]

  while (queue.length > 0) {
    const current = queue.shift()!
    if (seen.has(current)) continue
    if (!byName.has(current)) continue
    seen.add(current)
    ordered.push(current)
    for (const next of adj.get(current) ?? []) {
      if (!seen.has(next)) queue.push(next)
    }
  }

  // Append any unreachable states so the count still equals states.length
  for (const s of states) {
    if (!seen.has(s.name)) ordered.push(s.name)
  }

  return ordered
}

/**
 * Return 1-based step number and total for the current state.
 * Returns `{ step: 0, total: 0 }` when state is unknown / template missing.
 */
export function computeProgress(
  orderedStates: readonly string[],
  currentState: string | undefined
): { step: number; total: number; percent: number } {
  const total = orderedStates.length
  if (!currentState || total === 0) return { step: 0, total: 0, percent: 0 }
  const idx = orderedStates.indexOf(currentState)
  if (idx < 0) return { step: 0, total, percent: 0 }
  const step = idx + 1
  return { step, total, percent: Math.round((step / total) * 100) }
}
