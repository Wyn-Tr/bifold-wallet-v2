import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAgent } from '@credo-ts/react-hooks'
import { useIsFocused } from '@react-navigation/native'
import { MobileWorkflowService } from '../services/WorkflowService'
import { useWorkflowEvents } from './useWorkflowEvents'

const FINAL_STATUSES = new Set(['done', 'completed', 'cancelled', 'canceled', 'failed', 'error'])

/**
 * Hook that returns a workflow subtitle string for each connection.
 * The subtitle shows the most recently active workflow's template title and state,
 * e.g. "Student Card — issuing"
 */
export function useWorkflowSubtitles(connectionIds: string[]): {
  subtitles: Map<string, string>
  loading: boolean
} {
  const { agent } = useAgent()
  const [subtitles, setSubtitles] = useState<Map<string, string>>(new Map())
  const [loading, setLoading] = useState(true)
  const isFocused = useIsFocused()

  const service = useMemo(() => {
    if (!agent) return null
    try {
      const svc = new MobileWorkflowService(agent)
      return svc.isAvailable ? svc : null
    } catch {
      return null
    }
  }, [agent])

  const refresh = useCallback(async () => {
    if (!service || connectionIds.length === 0) {
      setLoading(false)
      return
    }

    try {
      const newSubtitles = new Map<string, string>()

      await Promise.all(
        connectionIds.map(async (connId) => {
          try {
            const instances = await service.listInstances(connId)

            // Find most recently updated non-final instance
            const active = instances
              .filter((i) => !FINAL_STATUSES.has(((i as any).status ?? '').toLowerCase()))
              .sort(
                (a, b) =>
                  new Date((b as any).updatedAt ?? (b as any).createdAt ?? 0).valueOf() -
                  new Date((a as any).updatedAt ?? (a as any).createdAt ?? 0).valueOf()
              )

            if (active.length === 0) return

            const inst = active[0] as any
            const templateId = inst.templateId
            const currentState: string = inst.state ?? ''

            // Load template for display hints and title
            let stateLabel: string | undefined
            try {
              const tpl = await service.getTemplate(templateId)
              // template title available if needed in the future
              // Prefer receiver profile display hint text for the current state
              const hints =
                (tpl?.template as any)?.display_hints?.profiles?.receiver?.states?.[currentState] ??
                (tpl?.template as any)?.display_hints?.profiles?.sender?.states?.[currentState] ??
                []
              for (const hint of hints) {
                if (hint.type === 'text' && hint.text) {
                  stateLabel = hint.text
                  break
                }
                if (hint.type === 'submit-button' && hint.label) {
                  stateLabel = hint.label
                  break
                }
              }
            } catch {
              // Fall back to humanized state
            }

            if (!stateLabel) {
              stateLabel = currentState.replace(/[-_]/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
            }

            newSubtitles.set(connId, stateLabel)
          } catch {
            // Skip this connection
          }
        })
      )

      setSubtitles(newSubtitles)
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [service, connectionIds])

  useEffect(() => {
    refresh()
  }, [refresh])

  // Auto-refresh when screen gains focus
  useEffect(() => {
    if (isFocused) {
      refresh()
    }
  }, [isFocused, refresh])

  // Auto-refresh on workflow state changes
  useWorkflowEvents({
    onStateChanged: useCallback(() => {
      refresh()
    }, [refresh]),
  })

  return { subtitles, loading }
}
