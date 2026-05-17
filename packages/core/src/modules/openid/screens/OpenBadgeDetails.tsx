import React, { useEffect, useMemo, useState } from 'react'
import { StackScreenProps } from '@react-navigation/stack'
import { OpenBadgeCredentialRecord } from '@ajna-inc/openbadges'
import { JsonLdCredentialRecord } from '../jsonLd/JsonLdCredentialRecord'
import { DeviceEventEmitter, Image, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useAgent } from '@credo-ts/react-hooks'

import { RootStackParams, Screens } from '../../../types/navigators'
import CommonRemoveModal from '../../../components/modals/CommonRemoveModal'
import { ModalUsage } from '../../../types/remove'
import { testIdWithKey } from '../../../utils/testable'
import { useTheme } from '../../../contexts/theme'
import { BifoldError } from '../../../types/error'
import { EventTypes } from '../../../constants'
import RecordRemove from '../../../components/record/RecordRemove'
import { useOpenIDCredentials } from '../context/OpenIDCredentialRecordProvider'
import { OpenIDCredentialType, W3cCredentialJson } from '../types'
import ScreenLayout from '../../../layout/ScreenLayout'
import { getCredentialForDisplay, getOpenBadgeDisplayData, isOpenBadgeCredential } from '../display'

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
  const { ColorPalette, TextTheme } = useTheme()
  const { agent } = useAgent()
  const { removeCredential, getOpenBadgeCredentialById, getJsonLdCredentialById } = useOpenIDCredentials()

  const [isRemoveModalDisplayed, setIsRemoveModalDisplayed] = useState(false)
  const [credentialRemoved, setCredentialRemoved] = useState(false)

  // Re-derive display data from the credential JSON via the central helper.
  // Single source of truth — same logic used by ListCredentials, the offer
  // screen, and the bundle resolver.
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

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: ColorPalette.brand.primaryBackground },
    scrollContent: { paddingBottom: 80 },
    headerSection: {
      alignItems: 'center',
      paddingVertical: 28,
      paddingHorizontal: 24,
      backgroundColor: ColorPalette.brand.secondaryBackground,
      borderBottomWidth: 1,
      borderBottomColor: ColorPalette.grayscale.lightGrey,
    },
    badgeImage: { width: 140, height: 140, borderRadius: 16, backgroundColor: ColorPalette.grayscale.lightGrey },
    placeholderImage: {
      width: 140,
      height: 140,
      borderRadius: 16,
      backgroundColor: ColorPalette.brand.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    placeholderText: { fontSize: 56, color: '#fff', fontWeight: '600' },
    name: { ...TextTheme.headingTwo, color: ColorPalette.brand.text, textAlign: 'center', marginTop: 16 },
    typeChip: {
      ...TextTheme.label,
      color: ColorPalette.grayscale.mediumGrey,
      textAlign: 'center',
      paddingHorizontal: 14,
      paddingVertical: 5,
      backgroundColor: ColorPalette.brand.primaryBackground,
      borderRadius: 14,
      overflow: 'hidden',
      marginTop: 8,
    },
    description: {
      ...TextTheme.normal,
      color: ColorPalette.brand.text,
      textAlign: 'center',
      marginTop: 16,
      lineHeight: 22,
    },
    section: {
      paddingHorizontal: 24,
      paddingVertical: 18,
      backgroundColor: ColorPalette.brand.secondaryBackground,
      marginTop: 12,
    },
    sectionTitle: {
      ...TextTheme.labelSubtitle,
      color: ColorPalette.grayscale.mediumGrey,
      marginBottom: 12,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    metaRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: ColorPalette.grayscale.lightGrey,
    },
    metaRowLast: { borderBottomWidth: 0 },
    metaLabel: { ...TextTheme.label, color: ColorPalette.grayscale.mediumGrey, flex: 1 },
    metaValue: {
      ...TextTheme.normal,
      color: ColorPalette.brand.text,
      flex: 2,
      textAlign: 'right',
    },
    groupHeaderRow: {
      paddingTop: 14,
      paddingBottom: 6,
    },
    groupHeaderLabel: {
      color: ColorPalette.brand.text,
      fontWeight: '600',
      textTransform: 'capitalize',
    },
    imageRow: {
      flexDirection: 'column',
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: ColorPalette.grayscale.lightGrey,
    },
    imageRowLabel: {
      ...TextTheme.label,
      color: ColorPalette.grayscale.mediumGrey,
      marginBottom: 8,
    },
    imageRowImage: {
      width: '100%',
      maxWidth: 240,
      height: 140,
      borderRadius: 8,
      backgroundColor: ColorPalette.grayscale.lightGrey,
      alignSelf: 'flex-start',
    },
    issuerRow: { flexDirection: 'row', alignItems: 'center' },
    issuerLogo: {
      width: 40,
      height: 40,
      borderRadius: 8,
      marginRight: 12,
      backgroundColor: ColorPalette.grayscale.lightGrey,
    },
    issuerName: { ...TextTheme.title, color: ColorPalette.brand.text, flex: 1 },
    removeSection: { marginTop: 24, marginBottom: 40 },
    exportButton: {
      marginTop: 24,
      marginHorizontal: 16,
      paddingVertical: 14,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: ColorPalette.brand.primary,
      alignItems: 'center',
    },
    exportButtonText: {
      ...TextTheme.normal,
      color: ColorPalette.brand.primary,
      fontWeight: '600',
    },
  })

  useEffect(() => {
    if (!agent) return
    const fetchCredential = async () => {
      if (credentialRemoved) return
      try {
        // Try JsonLd first (most credentials end up here for OID4VCI). Fall
        // back to OpenBadge if not found, since the same screen handles both.
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
      // Pass the right type so the provider routes the delete to the matching
      // repository (openbadges API for OBv3, JsonLdCredentialRepository for
      // generic JSON-LD).
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

  /**
   * Share the raw credential JSON via the OS share sheet. Useful for:
   *   - Pasting into a different verifier (walt.id, DigitalBazaar online tool)
   *     to confirm whether our credential / our VP are spec-compliant
   *   - Saving to Notes / Files for later inspection
   *   - Sending to issuer support when something looks off
   *
   * We share via the system share intent rather than copying to clipboard so
   * the user can pick exactly where it goes — no auto-clobber of clipboard
   * contents, no extra permissions for clipboard access.
   */
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

  // Heuristic: scan credentialSubject for an image-like attribute. W3C VCs
  // commonly carry a holder photo in fields like `image`, `photo`, `picture`,
  // `profileImage`, `avatar`. The value can be a string (URL or data URL) or
  // an object shaped like `{ id }` / `{ url }`. We surface this in the header
  // and exclude it from the attributes list to avoid showing a long URL.
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
  let subjectImageUrl: string | undefined
  let subjectImageKey: string | undefined
  for (const [k, v] of Object.entries(subject)) {
    if (!IMAGE_KEY_RE.test(k)) continue
    const url = resolveImageValue(v)
    if (url) {
      subjectImageUrl = url
      subjectImageKey = k
      break
    }
  }

  const formatValue = (v: unknown): string => {
    if (v === null || v === undefined) return ''
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return String(v)
    return JSON.stringify(v)
  }

  // Flatten the credential subject into displayable rows. Nested objects
  // become a header row (label-only, depth=N) followed by their leaves at
  // depth=N+1. Arrays of primitives are joined; arrays of objects are
  // recursed. This avoids dumping raw JSON like `{"identifier":"...","name":"..."}`
  // in the value cell, which is unreadable on mobile.
  type Row = {
    key: string
    label: string
    value?: string
    depth: number
    isHeader: boolean
    isImage?: boolean
  }
  const SKIP_KEYS = new Set(['id', 'sub', 'status', 'type', '@context', '@type'])
  const isPlainObject = (v: unknown): v is Record<string, unknown> =>
    typeof v === 'object' && v !== null && !Array.isArray(v)
  const flatten = (obj: Record<string, unknown>, depth: number, parentKey: string): Row[] => {
    const out: Row[] = []
    for (const [k, v] of Object.entries(obj)) {
      if (SKIP_KEYS.has(k)) continue
      if (depth === 0 && k === subjectImageKey) continue
      if (v === undefined || v === null) continue
      const fullKey = parentKey ? `${parentKey}.${k}` : k
      if (isPlainObject(v)) {
        const nested = flatten(v, depth + 1, fullKey)
        if (nested.length === 0) continue
        out.push({ key: fullKey, label: k, depth, isHeader: true })
        out.push(...nested)
      } else if (Array.isArray(v)) {
        const allPrimitive = v.every((item) => typeof item !== 'object' || item === null)
        if (allPrimitive) {
          out.push({ key: fullKey, label: k, value: v.map((x) => formatValue(x)).join(', '), depth, isHeader: false })
        } else {
          out.push({ key: fullKey, label: k, depth, isHeader: true })
          v.forEach((item, i) => {
            if (isPlainObject(item)) {
              out.push(...flatten(item, depth + 1, `${fullKey}[${i}]`))
            } else {
              out.push({ key: `${fullKey}[${i}]`, label: String(i), value: formatValue(item), depth: depth + 1, isHeader: false })
            }
          })
        }
      } else {
        out.push({ key: fullKey, label: k, value: formatValue(v), depth, isHeader: false })
      }
    }
    return out
  }
  const subjectRows = flatten(subject, 0, '')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const issuer = display.json.issuer as any
  const issuerName = typeof issuer === 'string' ? undefined : issuer?.name
  const issuerImage = typeof issuer === 'string' ? undefined : issuer?.image?.id ?? issuer?.image
  const issuerId = typeof issuer === 'string' ? issuer : issuer?.id

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const j = display.json as any
  const issuedRaw = j.validFrom ?? j.issuanceDate
  const expiresRaw = j.validUntil ?? j.expirationDate
  const formatDate = (raw?: string) => (raw ? new Date(raw).toLocaleDateString() : undefined)

  const types = display.json.type ?? []
  const credentialTypeLabel = types[types.length - 1] ?? 'Credential'

  const credentialName =
    j.name ??
    display.badgeData?.achievementName ??
    display.forDisplay?.display?.name ??
    credentialTypeLabel
  const credentialDescription = j.description ?? display.badgeData?.achievementDescription

  const renderHeaderImage = () => {
    if (display.isOpenBadge && display.badgeData?.achievementImage) {
      return (
        <Image
          source={{ uri: display.badgeData.achievementImage }}
          style={styles.badgeImage}
          resizeMode="contain"
          testID={testIdWithKey('OpenBadgeDetailImage')}
        />
      )
    }
    if (subjectImageUrl) {
      return (
        <Image
          source={{ uri: subjectImageUrl }}
          style={styles.badgeImage}
          resizeMode="cover"
          testID={testIdWithKey('SubjectImage')}
        />
      )
    }
    if (display.forDisplay?.display?.logo?.url) {
      return (
        <Image
          source={{ uri: display.forDisplay.display.logo.url }}
          style={styles.badgeImage}
          resizeMode="contain"
          testID={testIdWithKey('CredentialDetailLogo')}
        />
      )
    }
    const initial = (display.forDisplay?.display?.name ?? 'Credential').charAt(0).toUpperCase()
    return (
      <View style={styles.placeholderImage}>
        <Text style={styles.placeholderText}>{initial}</Text>
      </View>
    )
  }

  return (
    <ScreenLayout screen={Screens.OpenBadgeDetails}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        testID={testIdWithKey('OpenBadgeDetailsScreen')}
      >
        <View style={styles.headerSection}>
          {renderHeaderImage()}
          <Text style={styles.name} testID={testIdWithKey('CredentialName')}>
            {credentialName}
          </Text>
          <Text style={styles.typeChip} testID={testIdWithKey('CredentialTypeChip')}>
            {credentialTypeLabel}
          </Text>
          {credentialDescription ? (
            <Text style={styles.description} testID={testIdWithKey('CredentialDescription')}>
              {credentialDescription}
            </Text>
          ) : null}
        </View>

        {subjectRows.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Attributes</Text>
            {subjectRows.map((row, idx) => {
              const isLast = idx === subjectRows.length - 1
              const indent = row.depth > 0 ? { paddingLeft: 16 * row.depth } : null
              if (row.isHeader) {
                return (
                  <View key={row.key} style={[styles.groupHeaderRow, indent, isLast ? styles.metaRowLast : null]}>
                    <Text style={[styles.metaLabel, styles.groupHeaderLabel]}>{row.label}</Text>
                  </View>
                )
              }
              if (row.isImage && row.value) {
                return (
                  <View key={row.key} style={[styles.imageRow, indent, isLast ? styles.metaRowLast : null]}>
                    <Text style={styles.imageRowLabel}>{row.label}</Text>
                    <Image
                      source={{ uri: row.value }}
                      style={styles.imageRowImage}
                      resizeMode="contain"
                      testID={testIdWithKey(`Attribute-${row.key}`)}
                    />
                  </View>
                )
              }
              return (
                <View key={row.key} style={[styles.metaRow, indent, isLast ? styles.metaRowLast : null]}>
                  <Text style={styles.metaLabel}>{row.label}</Text>
                  <Text style={styles.metaValue} testID={testIdWithKey(`Attribute-${row.key}`)}>
                    {row.value}
                  </Text>
                </View>
              )
            })}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('CredentialDetails.IssuedBy')}</Text>
          <View style={styles.issuerRow}>
            {issuerImage ? (
              <Image
                source={{ uri: issuerImage as string }}
                style={styles.issuerLogo}
                resizeMode="contain"
                testID={testIdWithKey('IssuerLogo')}
              />
            ) : null}
            <Text style={styles.issuerName} testID={testIdWithKey('IssuerName')}>
              {issuerName ?? issuerId ?? t('ContactDetails.AContact')}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Details</Text>
          {formatDate(issuedRaw) ? (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>{t('CredentialDetails.Issued')}</Text>
              <Text style={styles.metaValue} testID={testIdWithKey('IssuedDate')}>
                {formatDate(issuedRaw)}
              </Text>
            </View>
          ) : null}
          {formatDate(expiresRaw) ? (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Expires</Text>
              <Text style={styles.metaValue} testID={testIdWithKey('ExpiryDate')}>
                {formatDate(expiresRaw)}
              </Text>
            </View>
          ) : null}
          <View style={[styles.metaRow, styles.metaRowLast]}>
            <Text style={styles.metaLabel}>Credential Type</Text>
            <Text style={styles.metaValue} testID={testIdWithKey('CredentialTypeValue')}>
              {credentialTypeLabel}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.exportButton}
          onPress={handleExportCredential}
          testID={testIdWithKey('ExportCredentialJson')}
          accessibilityLabel="Export credential JSON"
        >
          <Text style={styles.exportButtonText}>Export Credential JSON</Text>
        </TouchableOpacity>

        <View style={styles.removeSection}>
          <RecordRemove onRemove={toggleDeclineModalVisible} />
        </View>
      </ScrollView>

      <CommonRemoveModal
        usage={ModalUsage.CredentialRemove}
        visible={isRemoveModalDisplayed}
        onSubmit={handleDeclineTouched}
        onCancel={toggleDeclineModalVisible}
      />
    </ScreenLayout>
  )
}

export default OpenBadgeDetails
