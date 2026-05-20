import React, { useEffect, useMemo, useState } from 'react'
import { StackScreenProps } from '@react-navigation/stack'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Attribute, CredentialOverlay, Field } from '@bifold/oca/build/legacy'
import { BrandingOverlay } from '@bifold/oca'
import {
  DeviceEventEmitter,
  Image,
  InteractionManager,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import { useAgent } from '@credo-ts/react-hooks'
import { MdocRecord, SdJwtVcRecord, W3cCredentialRecord } from '@credo-ts/core'
import { OpenBadgeCredentialRecord } from '@ajna-inc/openbadges'

import { RootStackParams, Screens } from '../../../types/navigators'
import { getCredentialForDisplay } from '../display'
import CommonRemoveModal from '../../../components/modals/CommonRemoveModal'
import { ModalUsage } from '../../../types/remove'
import { testIdWithKey } from '../../../utils/testable'
import { BifoldError } from '../../../types/error'
import { EventTypes } from '../../../constants'
import RecordRemove from '../../../components/record/RecordRemove'
import { useOpenIDCredentials } from '../context/OpenIDCredentialRecordProvider'
import { OpenIDCredentialType, W3cCredentialDisplay } from '../types'
import { TOKENS, useServices } from '../../../container-api'
import { buildFieldsFromW3cCredsCredential, buildOverlayFromW3cCredential } from '../../../utils/oca'
import ScreenLayout from '../../../layout/ScreenLayout'
import OpenIDCredentialCard from '../components/OpenIDCredentialCard'
import {
  OpenIDCardRenderer,
  resolveDesign,
  DC_PALETTE,
  DCAttrList,
  DCIcon,
  DCTopBar,
  toAttrItem,
  type DCAttrItem,
} from '../../openid-card-design'

export enum OpenIDCredScreenMode {
  offer,
  details,
}

type OpenIDCredentialDetailsProps = StackScreenProps<RootStackParams, Screens.OpenIDCredentialDetails>

const OpenIDCredentialDetails: React.FC<OpenIDCredentialDetailsProps> = ({ navigation, route }) => {
  const { credentialId, type } = route.params

  const [credential, setCredential] = useState<
    W3cCredentialRecord | SdJwtVcRecord | MdocRecord | OpenBadgeCredentialRecord | undefined
  >(undefined)
  const [credentialDisplay, setCredentialDisplay] = useState<W3cCredentialDisplay>()
  const { t, i18n } = useTranslation()
  const { agent } = useAgent()
  const {
    removeCredential,
    getW3CCredentialById,
    getSdJwtCredentialById,
    getMdocCredentialById,
    getOpenBadgeCredentialById,
  } = useOpenIDCredentials()
  const [bundleResolver] = useServices([TOKENS.UTIL_OCA_RESOLVER])

  const [isRemoveModalDisplayed, setIsRemoveModalDisplayed] = useState(false)
  const [credentialRemoved, setCredentialRemoved] = useState(false)

  const [overlay, setOverlay] = useState<CredentialOverlay<BrandingOverlay>>({
    bundle: undefined,
    presentationFields: [],
    metaOverlay: undefined,
    brandingOverlay: undefined,
  })
  const [fallbackFields, setFallbackFields] = useState<Field[]>([])

  // Fold credential fetch + display computation into one effect so the screen
  // paints once with both pieces of state — eliminates a render cascade.
  useEffect(() => {
    if (!agent) return
    let cancelled = false
    ;(async () => {
      if (credentialRemoved) return
      try {
        let record: SdJwtVcRecord | W3cCredentialRecord | MdocRecord | OpenBadgeCredentialRecord | undefined

        if (type === OpenIDCredentialType.SdJwtVc) {
          record = await getSdJwtCredentialById(credentialId)
        } else if (type === OpenIDCredentialType.Mdoc) {
          record = await getMdocCredentialById(credentialId)
        } else if (type === OpenIDCredentialType.OpenBadge) {
          record = await getOpenBadgeCredentialById(credentialId)
        } else {
          record = await getW3CCredentialById(credentialId)
        }

        if (cancelled || !record) return
        try {
          const computed = getCredentialForDisplay(record)
          setCredential(record)
          setCredentialDisplay(computed)
        } catch {
          DeviceEventEmitter.emit(
            EventTypes.ERROR_ADDED,
            new BifoldError(
              t('Error.Title1033'),
              t('Error.Message1033'),
              t('CredentialDetails.CredentialNotFound'),
              1034
            )
          )
        }
      } catch (error) {
        DeviceEventEmitter.emit(
          EventTypes.ERROR_ADDED,
          new BifoldError(t('Error.Title1033'), t('Error.Message1033'), t('CredentialDetails.CredentialNotFound'), 1035)
        )
      }
    })()
    return () => {
      cancelled = true
    }
  }, [
    credentialId,
    type,
    getSdJwtCredentialById,
    getMdocCredentialById,
    getW3CCredentialById,
    getOpenBadgeCredentialById,
    agent,
    t,
    credentialRemoved,
  ])

  // Defer OCA bundle resolution until after the first paint settles — keeps
  // the initial render snappy. Falls back immediately to plain fields so the
  // attribute list shows up even before OCA finishes (or if it never does).
  useEffect(() => {
    if (!credentialDisplay || !bundleResolver || !i18n || !credentialDisplay.display) return
    let cancelled = false
    const interaction = InteractionManager.runAfterInteractions(async () => {
      const builtFallbackFields = buildFieldsFromW3cCredsCredential(credentialDisplay)
      if (cancelled) return
      setFallbackFields(builtFallbackFields)

      try {
        const resolvedOverlay = await buildOverlayFromW3cCredential({
          credentialDisplay,
          language: i18n.language,
          resolver: bundleResolver,
        })
        if (cancelled) return
        const ocaCount = resolvedOverlay.presentationFields?.length ?? 0
        setOverlay({
          ...resolvedOverlay,
          presentationFields: ocaCount > 0 ? resolvedOverlay.presentationFields : builtFallbackFields,
        })
      } catch {
        if (cancelled) return
        setOverlay((prev) => ({ ...prev, presentationFields: builtFallbackFields }))
      }
    })
    return () => {
      cancelled = true
      interaction.cancel()
    }
  }, [credentialDisplay, bundleResolver, i18n])

  const finalFields: Field[] = useMemo(
    () =>
      (overlay.presentationFields && overlay.presentationFields.length > 0
        ? overlay.presentationFields
        : fallbackFields) || [],
    [overlay.presentationFields, fallbackFields]
  )

  const toggleDeclineModalVisible = () => {
    if (credentialRemoved) return
    setIsRemoveModalDisplayed(!isRemoveModalDisplayed)
  }

  const handleDeclineTouched = async () => {
    setCredentialRemoved(true)
    setIsRemoveModalDisplayed(false)
    await new Promise((resolve) => setTimeout(resolve, 500))
    handleRemove()
  }

  const handleRemove = async () => {
    if (!credential) return
    try {
      await removeCredential(credential, type)
      navigation.pop()
    } catch (err) {
      const error = new BifoldError(t('Error.Title1025'), t('Error.Message1025'), (err as Error)?.message ?? '', 1025)
      DeviceEventEmitter.emit(EventTypes.ERROR_ADDED, error)
    }
  }

  const design = useMemo(() => (credential ? resolveDesign(credential as never) : null), [credential])

  // Build attribute items for DCAttrList from the OCA fields (which respect
  // OCA bundle ordering / labels when one matches). Object / array-of-object
  // values become nested children rather than dumped JSON in the value cell.
  // Note: the OCA `Attribute.value` is typed as string|number|null but
  // upstream sometimes passes through nested objects from credentialSubject —
  // and once OCA serialises through certain paths the value can be a JSON
  // string. We try-parse strings that look like JSON before formatting.
  const attrItems: DCAttrItem[] = useMemo(() => {
    const out: DCAttrItem[] = []
    for (const f of finalFields) {
      if (!(f instanceof Attribute)) continue
      if (f.name === 'id' || f.name === 'sub' || f.name === 'status' || f.name === 'type') continue
      const raw = f.value as unknown
      if (raw === null || raw === undefined) continue
      const value = maybeParseJson(raw)
      const item = toAttrItem(f.label ?? f.name, value)
      if (item) out.push(item)
    }
    return out
  }, [finalFields])

  if (!credentialDisplay) return null

  const issuerName = credentialDisplay.display.issuer?.name
  const issuerLogo = credentialDisplay.display.issuer?.logo?.url
  const credentialName = credentialDisplay.display.name

  return (
    <ScreenLayout screen={Screens.OpenIDCredentialDetails}>
      <View style={styles.root}>
        {/* Flat background — the previous absoluteFill LinearGradient was a
            full-screen native layer on Android with very subtle teal-on-teal
            stops. Dropping it removes a major source of overdraw on this
            heavy screen (which still nests gradients inside cards/marks). */}

        <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.safe}>
        <DCTopBar
          title={credentialName ?? t('Screens.CredentialDetails')}
          onBack={() => navigation.goBack()}
          backgroundColor="transparent"
        />
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          testID={testIdWithKey('OpenIDCredentialDetailsScreen')}
        >
          <View style={styles.heroSection}>
            {design ? (
              <OpenIDCardRenderer credentialRecord={credential as never} design={design} mode="full" />
            ) : (
              <OpenIDCredentialCard credentialDisplay={credentialDisplay} credentialRecord={credential} />
            )}
          </View>

          <View style={styles.verifiedBand}>
            <DCIcon name="verified" size={18} color={DC_PALETTE.accent} />
            <Text style={styles.verifiedText} numberOfLines={1}>
              Cryptographically verified
            </Text>
          </View>

          {attrItems.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>ATTRIBUTES</Text>
              <DCAttrList items={attrItems} />
            </View>
          ) : null}

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{t('CredentialDetails.IssuedBy').toUpperCase()}</Text>
            <View style={styles.issuerCard}>
              {issuerLogo ? (
                <Image source={{ uri: issuerLogo }} style={styles.issuerLogo} resizeMode="contain" />
              ) : (
                <View style={[styles.issuerLogo, styles.issuerLogoPlaceholder]}>
                  <Text style={styles.issuerLogoText}>
                    {(issuerName ?? credentialName ?? 'C').charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.issuerName} testID={testIdWithKey('IssuerName')} numberOfLines={1}>
                  {issuerName ?? t('ContactDetails.AContact')}
                </Text>
                <Text style={styles.issuerSubtitle} numberOfLines={1}>
                  Verified issuer
                </Text>
              </View>
              <DCIcon name="verified" size={18} color={DC_PALETTE.accent} />
            </View>
          </View>

          <TouchableOpacity
            style={styles.removeButton}
            onPress={toggleDeclineModalVisible}
            accessibilityLabel={t('CredentialDetails.RemoveFromWallet')}
          >
            <Text style={styles.removeButtonText}>{t('CredentialDetails.RemoveFromWallet')}</Text>
          </TouchableOpacity>
          {/* Keep the canonical remove flow available for tests/automation that
              key off the existing testID inside RecordRemove. */}
          <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.hiddenRemove}>
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

function maybeParseJson(value: unknown): unknown {
  if (typeof value !== 'string') return value
  const trimmed = value.trim()
  if (!trimmed || (trimmed[0] !== '{' && trimmed[0] !== '[')) return value
  try {
    return JSON.parse(trimmed)
  } catch {
    return value
  }
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: DC_PALETTE.bg },
  safe: { flex: 1 },
  scrollContent: { paddingHorizontal: 18, paddingTop: 10, paddingBottom: 80 },

  heroSection: { paddingBottom: 14 },

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
  verifiedText: { color: DC_PALETTE.accent, fontSize: 12.5, fontWeight: '600', flex: 1 },

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
  issuerLogo: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#FFFFFF' },
  issuerLogoPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  issuerLogoText: { color: DC_PALETTE.bg, fontSize: 16, fontWeight: '700' },
  issuerName: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  issuerSubtitle: { color: DC_PALETTE.muted, fontSize: 12, marginTop: 2 },

  removeButton: {
    marginTop: 28,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,122,110,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButtonText: { color: DC_PALETTE.danger, fontSize: 14, fontWeight: '600' },
  hiddenRemove: { height: 0, overflow: 'hidden' },
})

export default OpenIDCredentialDetails
