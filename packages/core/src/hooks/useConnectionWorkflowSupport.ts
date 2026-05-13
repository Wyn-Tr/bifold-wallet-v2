import { useEffect, useState } from 'react'
import { useAgent } from '@credo-ts/react-hooks'

import { getDisclosedProtocols, hasProtocol } from './peerProtocolCache'

const WORKFLOW_PROTOCOL_URI = 'https://didcomm.org/workflow/1.0'

/**
 * Reads the shared peer-protocol cache to determine whether the connection
 * at `connectionId` supports `https://didcomm.org/workflow/1.0`. The cache
 * is populated by a single feature-discovery query that any consumer (this
 * hook, `useAutoRequestPeerProfile`, etc.) may trigger — so we don't send a
 * separate probe per concern.
 *
 * Returns `null` while the probe is in flight (initial render), then `true`
 * or `false`.
 */
export function useConnectionWorkflowSupport(connectionId?: string): {
  supported: boolean | null
  isLoading: boolean
} {
  const { agent } = useAgent()
  const [supported, setSupported] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)

  useEffect(() => {
    if (!agent || !connectionId) {
      setSupported(null)
      setIsLoading(false)
      return
    }

    let cancelled = false
    setIsLoading(true)
    getDisclosedProtocols(agent, connectionId)
      .then((features) => {
        if (cancelled) return
        setSupported(hasProtocol(features, WORKFLOW_PROTOCOL_URI))
        setIsLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setSupported(false)
        setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [agent, connectionId])

  return { supported, isLoading }
}
