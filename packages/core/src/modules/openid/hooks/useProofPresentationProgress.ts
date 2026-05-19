// Progress tracker for the OID4VP share-proof flow. Producers
// (resolverProof.tsx / shareJsonLdPresentation.ts) publish milestones via
// `emitProofStep()` so the redesigned sending screen can advance its trail.

import { useEffect, useState } from 'react'
import { DeviceEventEmitter, EventSubscription } from 'react-native'

export type ProofStep = 'idle' | 'selected' | 'built' | 'sending' | 'done' | 'error'

export const ProofProgressEvents = {
  Updated: 'oid4vp:proof:step',
  Reset: 'oid4vp:proof:reset',
} as const

export function emitProofStep(step: ProofStep, message?: string): void {
  DeviceEventEmitter.emit(ProofProgressEvents.Updated, { step, message })
}

export function resetProofProgress(): void {
  DeviceEventEmitter.emit(ProofProgressEvents.Reset)
}

export interface ProofProgress {
  step: ProofStep
  message?: string
}

export function useProofPresentationProgress(): ProofProgress {
  const [progress, setProgress] = useState<ProofProgress>({ step: 'idle' })

  useEffect(() => {
    const subs: EventSubscription[] = []
    subs.push(
      DeviceEventEmitter.addListener(ProofProgressEvents.Updated, (p: ProofProgress) => {
        setProgress(p)
      })
    )
    subs.push(
      DeviceEventEmitter.addListener(ProofProgressEvents.Reset, () => {
        setProgress({ step: 'idle' })
      })
    )
    return () => {
      for (const s of subs) s.remove()
    }
  }, [])

  return progress
}

const ORDER: ProofStep[] = ['selected', 'built', 'sending']

export interface ProofStepDescriptor {
  key: ProofStep
  label: string
  hint?: string
}

export const PROOF_STEPS: ProofStepDescriptor[] = [
  { key: 'selected', label: 'Selected credential' },
  { key: 'built', label: 'Built presentation' },
  { key: 'sending', label: 'Sending to verifier' },
]

export function stateForProofStep(current: ProofStep, target: ProofStep): 'pending' | 'active' | 'done' | 'error' {
  if (current === 'error') return 'error'
  if (current === 'done') return 'done'
  const ci = ORDER.indexOf(current)
  const ti = ORDER.indexOf(target)
  if (ci === -1 || ti === -1) return 'pending'
  if (ti < ci) return 'done'
  if (ti === ci) return 'active'
  return 'pending'
}
