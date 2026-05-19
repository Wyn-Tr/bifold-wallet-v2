// Dark-teal proof-request screen. Ports `ProofRequestScreen()` from
// /Digicred Wallet/loading-screens.jsx (or screens.jsx) 1:1 in layout.

import React, { useMemo } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import {
  DC_PALETTE,
  DCActionRow,
  DCAttrList,
  DCCredentialMark,
  DCIcon,
  DCSectionLabel,
  DCTopBar,
  resolveDesign,
} from '../../../openid-card-design'
import { getCredentialForDisplay } from '../../display'

import type { SupportedCredentialRecord } from '../../../openid-card-design'

export interface OpenIDProofRequestRedesignedProps {
  /** The credential the wallet will use to satisfy the request. */
  selectedCredential: SupportedCredentialRecord
  /** Verifier display name (e.g. "Acme Co."). */
  verifierName: string
  /** Verifier domain shown under the name. */
  verifierDomain?: string
  /** Verifier is in the user's trust list. */
  verifierTrusted?: boolean
  /** Attributes the verifier asked for; shared=true means the wallet will share it. */
  requestedAttributes: { label: string; value?: string; shared?: boolean }[]
  /** Brief privacy callout shown above the action row. */
  selectiveDisclosureNote?: string
  hasMultipleCredentials?: boolean
  onChangeCredential?: () => void
  onShare: () => void
  onDeny: () => void
  shareInFlight?: boolean
  onBack?: () => void
  onHome?: () => void
}

export const OpenIDProofRequestRedesigned: React.FC<OpenIDProofRequestRedesignedProps> = ({
  selectedCredential,
  verifierName,
  verifierDomain,
  verifierTrusted,
  requestedAttributes,
  selectiveDisclosureNote,
  hasMultipleCredentials,
  onChangeCredential,
  onShare,
  onDeny,
  shareInFlight,
  onBack,
  onHome,
}) => {
  const design = useMemo(() => resolveDesign(selectedCredential), [selectedCredential])
  const display = useMemo(() => {
    try {
      return getCredentialForDisplay(selectedCredential as any)
    } catch {
      return null
    }
  }, [selectedCredential])

  const credentialName = display?.display?.name ?? 'Credential'
  const sharedCount = requestedAttributes.filter((a) => a.shared !== false).length

  return (
    <SafeAreaView edges={['bottom']} style={styles.safe}>
      <DCTopBar title="Proof Request" onBack={onBack} onHome={onHome} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.pill}>
          <Text style={styles.pillText}>PROOF REQUEST</Text>
        </View>
        <Text style={styles.headline}>{`${verifierName} is asking you to prove your identity`}</Text>

        <View style={styles.verifierCard}>
          <View style={styles.verifierAvatar}>
            <Text style={styles.verifierAvatarText}>{initials(verifierName)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.verifierName}>{verifierName}</Text>
            <View style={styles.verifierSubline}>
              {verifierTrusted ? <DCIcon name="verified" size={12} color={DC_PALETTE.accent} /> : null}
              <Text style={styles.verifierSublineText}>
                {verifierDomain ?? 'unknown verifier'}
                {verifierTrusted ? ' · Trusted' : null}
              </Text>
            </View>
          </View>
        </View>

        <DCSectionLabel>Using credential</DCSectionLabel>
        <View style={styles.credentialPicker}>
          {design ? <DCCredentialMark design={design} size={42} /> : null}
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.credentialName}>{credentialName}</Text>
            <Text style={styles.credentialSub}>{display?.display?.issuer?.name ?? 'Issuer'}</Text>
          </View>
          {hasMultipleCredentials && onChangeCredential ? (
            <TouchableOpacity onPress={onChangeCredential} accessibilityRole="button">
              <Text style={styles.changeLink}>Change</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <DCSectionLabel>You'll share</DCSectionLabel>
        <DCAttrList items={requestedAttributes} variant="shared" />

        {selectiveDisclosureNote ? (
          <View style={styles.callout}>
            <DCIcon name="info" size={14} color={DC_PALETTE.accent} />
            <Text style={styles.calloutText}>{selectiveDisclosureNote}</Text>
          </View>
        ) : null}

        <DCActionRow
          primaryLabel={`Share these ${sharedCount} attribute${sharedCount === 1 ? '' : 's'}`}
          primaryIcon="share"
          onPrimary={onShare}
          primaryLoading={shareInFlight}
          secondaryLabel="Deny"
          onSecondary={onDeny}
        />
      </ScrollView>
    </SafeAreaView>
  )
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
    backgroundColor: 'rgba(255,200,120,0.10)',
    marginBottom: 8,
    marginTop: 12,
  },
  pillText: { color: '#FFC878', fontSize: 11, fontWeight: '700', letterSpacing: 1.2 },
  headline: { color: '#FFFFFF', fontSize: 22, fontWeight: '700', lineHeight: 28 },
  verifierCard: {
    marginTop: 16,
    padding: 14,
    backgroundColor: DC_PALETTE.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: DC_PALETTE.cardBorder,
    flexDirection: 'row',
    alignItems: 'center',
  },
  verifierAvatar: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  verifierAvatarText: { color: '#062826', fontWeight: '700' },
  verifierName: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  verifierSubline: { flexDirection: 'row', alignItems: 'center', marginTop: 2, gap: 4 },
  verifierSublineText: { color: DC_PALETTE.muted, fontSize: 12 },
  credentialPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DC_PALETTE.card,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: DC_PALETTE.cardBorder,
  },
  credentialName: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  credentialSub: { color: DC_PALETTE.muted, fontSize: 12, marginTop: 2 },
  changeLink: { color: DC_PALETTE.accent, fontSize: 13, fontWeight: '600' },
  callout: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(125,224,213,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(125,224,213,0.15)',
  },
  calloutText: { color: '#E6F4F2', fontSize: 11.5, lineHeight: 16, marginLeft: 8, flex: 1 },
})

export default OpenIDProofRequestRedesigned
