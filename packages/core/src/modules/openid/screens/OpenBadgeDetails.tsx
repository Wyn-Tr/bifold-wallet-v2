import React, { useEffect, useMemo, useState } from 'react'
import { StackScreenProps } from '@react-navigation/stack'
import { OpenBadgeCredentialRecord } from '@ajna-inc/openbadges'
import { JsonLdCredentialRecord } from '../jsonLd/JsonLdCredentialRecord'
import { DeviceEventEmitter, Image, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useAgent } from '@credo-ts/react-hooks'
import { SafeAreaView } from 'react-native-safe-area-context'

import { RootStackParams, Screens } from '../../../types/navigators'
import CommonRemoveModal from '../../../components/modals/CommonRemoveModal'
import { ModalUsage } from '../../../types/remove'
import { testIdWithKey } from '../../../utils/testable'
import { BifoldError } from '../../../types/error'
import { EventTypes } from '../../../constants'
import RecordRemove from '../../../components/record/RecordRemove'
import { useOpenIDCredentials } from '../context/OpenIDCredentialRecordProvider'
import { OpenIDCredentialType, W3cCredentialJson } from '../types'
import ScreenLayout from '../../../layout/ScreenLayout'
import { getCredentialForDisplay, getOpenBadgeDisplayData, isOpenBadgeCredential } from '../display'
import {
  OpenIDCardRenderer,
  resolveDesign,
  DC_PALETTE,
  DCAttrList,
  DCIcon,
  DCTopBar,
  expandObject,
  type DCAttrItem,
} from '../../openid-card-design'

type OpenBadgeDetailsProps = StackScreenProps<RootStackParams, Screens.OpenBadgeDetails>

/**
 * JSON-LD credential details screen.
 *
 * Despite the name, this renders ANY OpenBadgeCredentialRecord — which we
 * currently use as the storage container for both OBv3 badges AND generic W3C
 * JSON-LD credentials (Alumni, Retail, etc.) issued via OID4VCI. We store them
 * in OpenBadgeCredentialRecord because Credo 0.5's W3cCredentialRecord rejects
 * VC v2 documents and DataIntegrityProof at class-validator. The screen
 * inspects the credential's JSON-LD `type` array and renders OBv3-style
 * (achievement card) only when the credential is genuinely an OBv3 badge.
 */
const OpenBadgeDetails: React.FC<OpenBadgeDetailsProps> = ({ navigation, route }) => {
  const { credentialId } = route.params

  const [credential, setCredential] = useState<
    OpenBadgeCredentialRecord | JsonLdCredentialRecord | undefined
  >(undefined)
  const { t } = useTranslation()
  const { agent } = useAgent()
  const { removeCredential, getOpenBadgeCredentialById, getJsonLdCredentialById } = useOpenIDCredentials()

  const [isRemoveModalDisplayed, setIsRemoveModalDisplayed] = useState(false)
  const [credentialRemoved, setCredentialRemoved] = useState(false)

  const display = useMemo(() => {
    if (!credential) return null
    try {
      const d = getCredentialForDisplay(credential)
      const credentialJson = ((credential as { credential?: unknown }).credential ?? {}) as W3cCredentialJson
      const isOb = isOpenBadgeCredential(credentialJson)
      return {
        forDisplay: d,
        json: credentialJson,
        isOpenBadge: isOb,
        badgeData: isOb ? getOpenBadgeDisplayData(credentialJson) : null,
      }
    } catch {
      return null
    }
  }, [credential])

  useEffect(() => {
    if (!agent) return
    const fetchCredential = async () => {
      if (credentialRemoved) return
      try {
        let record: OpenBadgeCredentialRecord | JsonLdCredentialRecord | undefined =
          await getJsonLdCredentialById(credentialId)
        if (!record) record = await getOpenBadgeCredentialById(credentialId)

        if (record) {
          setCredential(record)
        } else {
          DeviceEventEmitter.emit(
            EventTypes.ERROR_ADDED,
            new BifoldError(t('Error.Title1033'), t('Error.Message1033'), 'Credential not found', 1035)
          )
        }
      } catch (error) {
        DeviceEventEmitter.emit(
          EventTypes.ERROR_ADDED,
          new BifoldError(t('Error.Title1033'), t('Error.Message1033'), (error as Error)?.message ?? '', 1035)
        )
      }
    }
    fetchCredential()
  }, [credentialId, getOpenBadgeCredentialById, getJsonLdCredentialById, agent, t, credentialRemoved])

  const toggleDeclineModalVisible = () => {
    if (credentialRemoved) return
    setIsRemoveModalDisplayed(!isRemoveModalDisplayed)
  }

  const handleRemove = async () => {
    if (!credential) return
    try {
      const credType =
        (credential as { type?: string }).type === 'OpenBadgeCredentialRecord'
          ? OpenIDCredentialType.OpenBadge
          : OpenIDCredentialType.JsonLd
      await removeCredential(credential, credType)
      navigation.pop()
    } catch (err) {
      const error = new BifoldError(t('Error.Title1025'), t('Error.Message1025'), (err as Error)?.message ?? '', 1025)
      DeviceEventEmitter.emit(EventTypes.ERROR_ADDED, error)
    }
  }

  const handleDeclineTouched = async () => {
    setCredentialRemoved(true)
    setIsRemoveModalDisplayed(false)
    await new Promise((resolve) => setTimeout(resolve, 500))
    handleRemove()
  }

  const handleExportCredential = async () => {
    if (!display?.json) return
    try {
      const json = JSON.stringify(display.json, null, 2)
      await Share.share({
        message: json,
        title: `Credential — ${(display.json as { id?: string }).id ?? 'json-ld'}`,
      })
    } catch (err) {
      const error = new BifoldError(
        'Export failed',
        'Could not share credential JSON',
        (err as Error)?.message ?? '',
        1025
      )
      DeviceEventEmitter.emit(EventTypes.ERROR_ADDED, error)
    }
  }

  if (!credential || !display) return null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const subject = (Array.isArray(display.json.credentialSubject)
    ? display.json.credentialSubject[0] ?? {}
    : display.json.credentialSubject ?? {}) as Record<string, unknown>

  const IMAGE_KEY_RE = /^(image|photo|picture|portrait|avatar|headshot|profileImage|profilePicture)$/i
  const isLikelyImageString = (s: string): boolean =>
    s.startsWith('data:image') ||
    /\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(s) ||
    s.startsWith('http://') ||
    s.startsWith('https://')
  const resolveImageValue = (v: unknown): string | undefined => {
    if (!v) return undefined
    if (typeof v === 'string') return isLikelyImageString(v) ? v : undefined
    if (typeof v === 'object') {
      const obj = v as { id?: unknown; url?: unknown }
      const candidate = (typeof obj.id === 'string' && obj.id) || (typeof obj.url === 'string' && obj.url)
      return candidate && isLikelyImageString(candidate) ? candidate : undefined
    }
    return undefined
  }
  let subjectImageKey: string | undefined
  for (const [k, v] of Object.entries(subject)) {
    if (!IMAGE_KEY_RE.test(k)) continue
    if (resolveImageValue(v)) {
      subjectImageKey = k
      break
    }
  }

  // Split top-level subject keys into separate DCAttrList sections so the
  // page reads like the mockup's stacked cards (Achievement / Recipient /
  // …). Nested objects inside each section become indented children rows.
  type RowGroup = { title?: string; items: DCAttrItem[] }
  const rowGroups: RowGroup[] = []
  const inline: RowGroup = { items: [] }
  rowGroups.push(inline)
  for (const [k, v] of Object.entries(subject)) {
    if (k === subjectImageKey) continue
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      const children = expandObject(v as Record<string, unknown>)
      if (children.length > 0) {
        rowGroups.push({ title: k, items: children })
      }
      continue
    }
    const flat = expandObject({ [k]: v })
    if (flat.length > 0) inline.items.push(...flat)
  }
  const filledGroups = rowGroups.filter((g) => g.items.length > 0)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const issuer = display.json.issuer as any
  const issuerName = typeof issuer === 'string' ? undefined : issuer?.name
  const issuerImage = typeof issuer === 'string' ? undefined : issuer?.image?.id ?? issuer?.image
  const issuerId = typeof issuer === 'string' ? issuer : issuer?.id

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const j = display.json as any
  const issuedRaw = j.validFrom ?? j.issuanceDate
  const expiresRaw = j.validUntil ?? j.expirationDate
  const formatDate = (raw?: string) => {
    if (!raw) return undefined
    const d = new Date(raw)
    if (Number.isNaN(d.getTime())) return raw
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  }

  const types = display.json.type ?? []
  const credentialTypeLabel = types[types.length - 1] ?? 'Credential'
  const credentialDescription = j.description ?? display.badgeData?.achievementDescription

  const design = resolveDesign(credential as any)

  return (
    <ScreenLayout screen={Screens.OpenBadgeDetails}>
      <View style={styles.root}>
        {/* Flat background — see OpenIDCredentialDetails for rationale. */}

        <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.safe}>
        <DCTopBar
          title={display.forDisplay?.display?.name ?? credentialTypeLabel}
          onBack={() => navigation.goBack()}
          backgroundColor="transparent"
        />
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          testID={testIdWithKey('OpenBadgeDetailsScreen')}
        >
          {/* Hero region — branded card if shape-matched, else OBv3 image / portrait / issuer logo. */}
          <View style={styles.heroSection}>
            {design ? (
              <OpenIDCardRenderer credentialRecord={credential as any} design={design} mode="full" />
            ) : (
              <FallbackHero display={display} />
            )}
          </View>

          {/* Verified band */}
          <View style={styles.verifiedBand}>
            <DCIcon name="verified" size={18} color={DC_PALETTE.accent} />
            <Text style={styles.verifiedText}>Cryptographically verified</Text>
          </View>

          {credentialDescription ? (
            <View style={styles.descriptionCard}>
              <Text style={styles.description}>{credentialDescription}</Text>
            </View>
          ) : null}

          {filledGroups.map((g, gi) => (
            <View key={`grp-${gi}`} style={styles.section}>
              <Text style={styles.sectionLabel}>{(g.title ?? 'Attributes').toString().toUpperCase()}</Text>
              <DCAttrList items={g.items} />
            </View>
          ))}

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{t('CredentialDetails.IssuedBy').toUpperCase()}</Text>
            <View style={styles.issuerCard}>
              {issuerImage ? (
                <Image
                  source={{ uri: issuerImage as string }}
                  style={styles.issuerLogo}
                  resizeMode="contain"
                  testID={testIdWithKey('IssuerLogo')}
                />
              ) : (
                <View style={[styles.issuerLogo, styles.issuerLogoPlaceholder]}>
                  <Text style={styles.issuerLogoText}>
                    {(issuerName ?? issuerId ?? 'C').charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.issuerName} testID={testIdWithKey('IssuerName')} numberOfLines={1}>
                  {issuerName ?? issuerId ?? t('ContactDetails.AContact')}
                </Text>
                <Text style={styles.issuerSubtitle} numberOfLines={1}>
                  Verified issuer
                </Text>
              </View>
              <DCIcon name="verified" size={18} color={DC_PALETTE.accent} />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>DETAILS</Text>
            <DCAttrList
              items={[
                ...(formatDate(issuedRaw) ? [{ label: 'issued', value: formatDate(issuedRaw)! }] : []),
                ...(formatDate(expiresRaw) ? [{ label: 'expires', value: formatDate(expiresRaw)! }] : []),
                { label: 'credential_type', value: credentialTypeLabel },
              ]}
            />
          </View>

          <TouchableOpacity
            style={styles.exportButton}
            onPress={handleExportCredential}
            testID={testIdWithKey('ExportCredentialJson')}
            accessibilityLabel="Export credential JSON"
          >
            <DCIcon name="share" size={15} color="#FFFFFF" />
            <Text style={styles.exportButtonText}>Export Credential JSON</Text>
          </TouchableOpacity>

          <View style={styles.removeSection}>
            <RecordRemove onRemove={toggleDeclineModalVisible} />
          </View>
        </ScrollView>
        </SafeAreaView>

        <CommonRemoveModal
          usage={ModalUsage.CredentialRemove}
          visible={isRemoveModalDisplayed}
          onSubmit={handleDeclineTouched}
          onCancel={toggleDeclineModalVisible}
        />
      </View>
    </ScreenLayout>
  )
}

const FallbackHero: React.FC<{
  display: {
    forDisplay: ReturnType<typeof getCredentialForDisplay> | null
    badgeData: { achievementImage?: string } | null
    isOpenBadge: boolean
  }
}> = ({ display }) => {
  if (display.isOpenBadge && display.badgeData?.achievementImage) {
    return (
      <Image
        source={{ uri: display.badgeData.achievementImage }}
        style={styles.fallbackImage}
        resizeMode="contain"
        testID={testIdWithKey('OpenBadgeDetailImage')}
      />
    )
  }
  if (display.forDisplay?.display?.logo?.url) {
    return (
      <Image
        source={{ uri: display.forDisplay.display.logo.url }}
        style={styles.fallbackImage}
        resizeMode="contain"
        testID={testIdWithKey('CredentialDetailLogo')}
      />
    )
  }
  const initial = (display.forDisplay?.display?.name ?? 'C').charAt(0).toUpperCase()
  return (
    <View style={styles.fallbackPlaceholder}>
      <Text style={styles.fallbackInitial}>{initial}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: DC_PALETTE.bg },
  safe: { flex: 1 },
  scrollContent: { paddingHorizontal: 18, paddingTop: 10, paddingBottom: 80 },

  heroSection: { paddingBottom: 14 },

  fallbackImage: {
    width: '100%',
    aspectRatio: 1.45,
    borderRadius: 18,
    backgroundColor: DC_PALETTE.card,
  },
  fallbackPlaceholder: {
    width: '100%',
    aspectRatio: 1.45,
    borderRadius: 18,
    backgroundColor: DC_PALETTE.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackInitial: { color: '#FFFFFF', fontSize: 56, fontWeight: '600' },

  verifiedBand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(125,224,213,0.10)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(125,224,213,0.25)',
    marginTop: 4,
  },
  verifiedText: {
    color: DC_PALETTE.accent,
    fontSize: 12.5,
    fontWeight: '600',
    flex: 1,
  },

  descriptionCard: {
    backgroundColor: DC_PALETTE.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: DC_PALETTE.cardBorder,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginTop: 14,
  },
  description: {
    color: DC_PALETTE.muted,
    fontSize: 13.5,
    lineHeight: 20,
  },

  section: { marginTop: 22 },
  sectionLabel: {
    color: DC_PALETTE.subMuted,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.5,
    marginBottom: 12,
  },

  issuerCard: {
    backgroundColor: DC_PALETTE.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: DC_PALETTE.cardBorder,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  issuerLogo: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },
  issuerLogoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  issuerLogoText: { color: DC_PALETTE.bg, fontSize: 16, fontWeight: '700' },
  issuerName: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  issuerSubtitle: { color: DC_PALETTE.muted, fontSize: 12, marginTop: 2 },

  exportButton: {
    marginTop: 22,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  exportButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },

  removeSection: { marginTop: 24, marginBottom: 40 },
})

export default OpenBadgeDetails
