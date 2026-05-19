// Progress tracker for the OID4VCI accept flow. The redesigned accept-loading
// screen reads `currentStep` to advance its 4-step indicator. Producers (the
// receive-credential paths in offerResolve.tsx / receiveJsonLdCredential.ts)
// publish milestones via the same event emitter the wallet already uses.

import { useEffect, useState } from 'react'
import { DeviceEventEmitter, EventSubscription } from 'react-native'

export type AcceptStep = 'idle' | 'connected' | 'authorized' | 'verifying' | 'saving' | 'done' | 'error'

export const AcceptProgressEvents = {
  Updated: 'oid4vci:accept:step',
  Reset: 'oid4vci:accept:reset',
} as const

export function emitAcceptStep(step: AcceptStep, message?: string): void {
  DeviceEventEmitter.emit(AcceptProgressEvents.Updated, { step, message })
}

export function resetAcceptProgress(): void {
  DeviceEventEmitter.emit(AcceptProgressEvents.Reset)
}

export interface AcceptProgress {
  step: AcceptStep
  message?: string
}

export function useCredentialOfferProgress(): AcceptProgress {
  const [progress, setProgress] = useState<AcceptProgress>({ step: 'idle' })

  useEffect(() => {
    const subs: EventSubscription[] = []
    subs.push(
      DeviceEventEmitter.addListener(AcceptProgressEvents.Updated, (p: AcceptProgress) => {
        setProgress(p)
      })
    )
    subs.push(
      DeviceEventEmitter.addListener(AcceptProgressEvents.Reset, () => {
        setProgress({ step: 'idle' })
      })
    )
    return () => {
      for (const s of subs) s.remove()
    }
  }, [])

  return progress
}

// =============================================================================
// Helper for declarative step rendering.
// =============================================================================

const ORDER: AcceptStep[] = ['connected', 'authorized', 'verifying', 'saving']

export interface AcceptStepDescriptor {
  key: AcceptStep
  label: string
  hint?: string
}

export const ACCEPT_STEPS: AcceptStepDescriptor[] = [
  { key: 'connected', label: 'Connected to issuer', hint: 'TLS handshake + metadata fetched' },
  { key: 'authorized', label: 'Authorization confirmed', hint: 'Access token issued' },
  { key: 'verifying', label: 'Verifying issuer signature', hint: 'Cryptographic verification' },
  { key: 'saving', label: 'Saving to wallet', hint: 'Encrypted storage' },
]

export function stateForStep(current: AcceptStep, target: AcceptStep): 'pending' | 'active' | 'done' | 'error' {
  if (current === 'error') return 'error'
  if (current === 'done') return 'done'
  const ci = ORDER.indexOf(current)
  const ti = ORDER.indexOf(target)
  if (ci === -1 || ti === -1) return 'pending'
  if (ti < ci) return 'done'
  if (ti === ci) return 'active'
  return 'pending'
}
