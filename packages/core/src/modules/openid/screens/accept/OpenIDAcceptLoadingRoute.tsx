// Navigation-aware wrapper around OpenIDAcceptLoadingScreen.

import React, { useEffect, useMemo, useState } from 'react'
import { StackScreenProps } from '@react-navigation/stack'

import { DeliveryStackParams, Screens } from '../../../../types/navigators'
import { useOpenIDCredentials } from '../../context/OpenIDCredentialRecordProvider'
import { resolveDesign } from '../../../openid-card-design'
import { OpenIDAcceptLoadingScreen } from './OpenIDAcceptLoadingScreen'

import type { CardDesign } from '../../../openid-card-design'
import type { SupportedCredentialRecord } from '../../../openid-card-design'

type Props = StackScreenProps<DeliveryStackParams, Screens.OpenIDAcceptLoading>

export const OpenIDAcceptLoadingRoute: React.FC<Props> = ({ navigation, route }) => {
  const { credentialId, credentialName, issuerName } = route.params ?? {}
  const {
    openIdState,
    getOpenBadgeCredentialById,
    getJsonLdCredentialById,
    getW3CCredentialById,
    getSdJwtCredentialById,
    getMdocCredentialById,
  } = useOpenIDCredentials()
  const [record, setRecord] = useState<SupportedCredentialRecord | null>(null)

  useEffect(() => {
    let cancelled = false
    if (!credentialId) return
    // Prefer the in-memory cache — instant.
    const cached: SupportedCredentialRecord | undefined =
      openIdState.w3cCredentialRecords.find((c) => c.id === credentialId) ||
      openIdState.sdJwtVcRecords.find((c) => c.id === credentialId) ||
      openIdState.mdocVcRecords.find((c) => c.id === credentialId) ||
      openIdState.openBadgeCredentialRecords.find((c) => c.id === credentialId) ||
      openIdState.jsonLdCredentialRecords.find((c) => c.id === credentialId)
    if (cached) {
      setRecord(cached)
      return
    }
    // Fall back to async lookup for anything not yet hydrated in the cache.
    (async () => {
      try {
        const tries: Array<Promise<SupportedCredentialRecord | undefined>> = [
          getOpenBadgeCredentialById(credentialId) as Promise<SupportedCredentialRecord | undefined>,
          getJsonLdCredentialById(credentialId) as Promise<SupportedCredentialRecord | undefined>,
          getW3CCredentialById(credentialId) as Promise<SupportedCredentialRecord | undefined>,
          getSdJwtCredentialById(credentialId) as Promise<SupportedCredentialRecord | undefined>,
          getMdocCredentialById(credentialId) as Promise<SupportedCredentialRecord | undefined>,
        ]
        for (const p of tries) {
          const r = await p
          if (cancelled) return
          if (r) {
            setRecord(r)
            return
          }
        }
      } catch {
        // best-effort lookup — fall back to design=null
      }
    })()
    return () => {
      cancelled = true
    }
  }, [
    credentialId,
    openIdState,
    getOpenBadgeCredentialById,
    getJsonLdCredentialById,
    getW3CCredentialById,
    getSdJwtCredentialById,
    getMdocCredentialById,
  ])

  const design = useMemo<CardDesign | null>(() => (record ? resolveDesign(record) : null), [record])

  return (
    <OpenIDAcceptLoadingScreen
      design={design}
      credentialName={credentialName}
      issuerName={issuerName}
      onCancel={() => navigation.goBack()}
      onBack={() => navigation.goBack()}
    />
  )
}

export default OpenIDAcceptLoadingRoute
