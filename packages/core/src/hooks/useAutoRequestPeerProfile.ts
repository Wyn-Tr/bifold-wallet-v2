import { DidExchangeState } from '@credo-ts/core'
import { useConnections } from '@credo-ts/react-hooks'
import { useEffect, useRef } from 'react'

import { useAppAgent } from '../utils/agent'
import { getDisclosedProtocols, hasProtocol } from './peerProtocolCache'

const USER_PROFILE_PROTOCOL = 'https://didcomm.org/user-profile/1.0'

/**
 * On each connection transitioning to `Completed`, gate the user-profile
 * request behind a one-shot feature-discovery probe. If the peer doesn't
 * disclose `https://didcomm.org/user-profile/1.0`, no request is sent —
 * which avoids the unrecognized-message → problem-report storm against
 * peers that don't implement the protocol.
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

      // Mark optimistically so we don't refire while the discovery promise
      // is in flight. On any failure we un-mark so the next render retries.
      requested.current.add(c.id)
      ;(async () => {
        try {
          const features = await getDisclosedProtocols(agent, c.id)
          if (!hasProtocol(features, USER_PROFILE_PROTOCOL)) {
            // Peer doesn't speak user-profile; leave the slot marked so we
            // don't keep re-probing every render.
            return
          }
          await agent.modules.userProfile.requestUserProfile({ connectionId: c.id })
        } catch {
          requested.current.delete(c.id)
        }
      })()
    }
  }, [agent, connections])
}
