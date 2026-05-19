// Dark-teal credential offer screen. Ports `CredentialOfferScreen()` from
// /Digicred Wallet/screens.jsx 1:1 in layout. State (the actual receive-credential
// call, txCode handling, replacement flow) is delegated to the host screen via
// the `onAccept` / `onDecline` callbacks.

import React, { useMemo } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import {
  DC_PALETTE,
  DCActionRow,
  DCAttrList,
  DCSectionLabel,
  DCTopBar,
} from '../../../openid-card-design'
import { resolveDesign } from '../../../openid-card-design'
import { OpenIDCardRenderer } from '../../../openid-card-design'
import { getCredentialForDisplay } from '../../display'

import type { SupportedCredentialRecord } from '../../../openid-card-design'

export interface OpenIDCredentialOfferRedesignedProps {
  credentialRecord: SupportedCredentialRecord
  /** Issuer display name. */
  issuerName?: string
  /** Issuer hostname / domain (sub-line). */
  issuerDomain?: string
  /** Optional rolling list of attributes the wallet will store. */
  attributesPreview?: { label: string; value?: string }[]
  /** Title above the card — e.g. "Acme wants to issue you a Student ID". */
  headline?: string
  onAccept: () => void | Promise<void>
  onDecline: () => void
  acceptInFlight?: boolean
  onBack?: () => void
  onHome?: () => void
}

export const OpenIDCredentialOfferRedesigned: React.FC<OpenIDCredentialOfferRedesignedProps> = ({
  credentialRecord,
  issuerName,
  issuerDomain,
  attributesPreview,
  headline,
  onAccept,
  onDecline,
  acceptInFlight,
  onBack,
  onHome,
}) => {
  const design = useMemo(() => resolveDesign(credentialRecord), [credentialRecord])
  const display = useMemo(() => {
    try {
      return getCredentialForDisplay(credentialRecord as any)
    } catch {
      return null
    }
  }, [credentialRecord])

  const credentialName = display?.display?.name ?? 'Credential'
  const computedHeadline = headline ?? `${issuerName ?? 'An issuer'} wants to issue you a ${credentialName}`
  const computedIssuer = issuerName ?? display?.display?.issuer?.name ?? 'Issuer'
  const computedIssuerDomain = issuerDomain ?? display?.display?.issuer?.domain

  // Default attribute preview: every visible attribute on the credential.
  const previewItems = useMemo(() => {
    if (attributesPreview && attributesPreview.length > 0) return attributesPreview
    const attrs = (display?.attributes ?? {}) as Record<string, unknown>
    return Object.entries(attrs)
      .filter(([, v]) => v !== null && v !== undefined && typeof v !== 'object')
      .slice(0, 8)
      .map(([k, v]) => ({
        label: humanize(k),
        value: String(v),
        shared: true,
      }))
  }, [attributesPreview, display])

  return (
    <SafeAreaView edges={['bottom']} style={styles.safe}>
      <DCTopBar title="Credential Offer" onBack={onBack} onHome={onHome} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.pill}>
          <Text style={styles.pillText}>INCOMING OFFER</Text>
        </View>
        <Text style={styles.headline}>{computedHeadline}</Text>

        <View style={{ marginTop: 16 }}>
          {design ? (
            <OpenIDCardRenderer credentialRecord={credentialRecord} design={design} mode="full" />
          ) : (
            <View style={styles.cardFallback}>
              <Text style={styles.cardFallbackText}>{credentialName}</Text>
            </View>
          )}
        </View>

        <View style={styles.issuerRow}>
          <View style={styles.issuerAvatar}>
            <Text style={styles.issuerAvatarText}>{initials(computedIssuer)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.issuerName}>{computedIssuer}</Text>
            {computedIssuerDomain ? (
              <Text style={styles.issuerDomain}>{computedIssuerDomain}</Text>
            ) : null}
          </View>
        </View>

        <DCSectionLabel>You'll receive</DCSectionLabel>
        <DCAttrList items={previewItems} />

        <DCActionRow
          primaryLabel="Accept credential"
          onPrimary={onAccept}
          primaryLoading={acceptInFlight}
          secondaryLabel="Decline"
          onSecondary={onDecline}
        />
      </ScrollView>
    </SafeAreaView>
  )
}

function humanize(key: string): string {
  return key
    .replace(/[._-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0] ?? '').join('').toUpperCase() || '?'
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: DC_PALETTE.bg },
  scroll: { padding: 18, paddingBottom: 32 },
  pill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(125,224,213,0.12)',
    marginBottom: 8,
    marginTop: 12,
  },
  pillText: { color: DC_PALETTE.accent, fontSize: 11, fontWeight: '700', letterSpacing: 1.2 },
  headline: { color: '#FFFFFF', fontSize: 22, fontWeight: '700', lineHeight: 28 },
  cardFallback: {
    backgroundColor: DC_PALETTE.card,
    borderRadius: 18,
    padding: 32,
    alignItems: 'center',
  },
  cardFallbackText: { color: '#FFFFFF', fontWeight: '700', fontSize: 18 },
  issuerRow: {
    marginTop: 14,
    padding: 14,
    backgroundColor: DC_PALETTE.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: DC_PALETTE.cardBorder,
    flexDirection: 'row',
    alignItems: 'center',
  },
  issuerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  issuerAvatarText: { color: '#062826', fontWeight: '700' },
  issuerName: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  issuerDomain: { color: DC_PALETTE.muted, fontSize: 12, marginTop: 2 },
})

export default OpenIDCredentialOfferRedesigned
