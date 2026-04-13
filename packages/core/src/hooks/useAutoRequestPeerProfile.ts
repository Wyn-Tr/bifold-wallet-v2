import { DidExchangeState } from '@credo-ts/core'
import { useConnections } from '@credo-ts/react-hooks'
import { useEffect, useRef } from 'react'

import { useAppAgent } from '../utils/agent'

/**
 * When a connection first becomes `Completed` and has no `UserProfile`
 * metadata yet, fire one `requestUserProfile`. Tracks already-requested ids
 * to avoid refiring on re-renders.
 *
 * Mount once from a component inside the AgentProvider (e.g. the root stack).
 */
export function useAutoRequestPeerProfile() {
  const { agent } = useAppAgent()
  const { records: connections } = useConnections()
  const requested = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!agent) return
    for (const c of connections) {
      if (c.state !== DidExchangeState.Completed) continue
      if (requested.current.has(c.id)) continue
      const existing = c.metadata.get('UserProfile')
      if (existing) {
        requested.current.add(c.id)
        continue
      }
      requested.current.add(c.id)
      agent.modules.userProfile
        .requestUserProfile({ connectionId: c.id })
        .catch(() => {
          // non-fatal; allow retry on next mount
          requested.current.delete(c.id)
        })
    }
  }, [agent, connections])
}
