import { W3cCredentialRecord } from '@credo-ts/core'
import { OpenBadgeCredentialRecord } from '@ajna-inc/openbadges'
import { JsonLdCredentialRecord } from '../jsonLd/JsonLdCredentialRecord'
import { useAgent } from '@credo-ts/react-hooks'
import { CommonActions } from '@react-navigation/native'
import { StackScreenProps } from '@react-navigation/stack'
import React, { useCallback, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  DeviceEventEmitter,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import LinearGradient from 'react-native-linear-gradient'
import { SafeAreaView } from 'react-native-safe-area-context'

import CommonRemoveModal from '../../../components/modals/CommonRemoveModal'
import { flattenSubject } from '../utils/flattenSubject'
import { EventTypes } from '../../../constants'
import CredentialOfferAccept from '../../../screens/CredentialOfferAccept'
import { BifoldError } from '../../../types/error'
import { DeliveryStackParams, Screens, Stacks, TabStacks } from '../../../types/navigators'
import { ModalUsage } from '../../../types/remove'
import { testIdWithKey } from '../../../utils/testable'
import { getCredentialForDisplay } from '../display'
import { NotificationEventType } from '../notification'
import { temporaryMetaVanillaObject, setRefreshCredentialMetadata } from '../metadata'
import { useAcceptReplacement } from '../hooks/useAcceptReplacement'
import { useDeclineReplacement } from '../hooks/useDeclineReplacement'
import { acquirePreAuthorizedAccessToken, receiveCredentialFromOpenId4VciOffer } from '../offerResolve'
import { getCredentialConfigurationIds } from '../utils/utils'
import { RefreshStatus } from '../refresh/types'
import { OpenId4VciPendingCredentialOffer } from '../types'
import {
  DC_PALETTE,
  DCActionRow,
  DCAttrList,
  DCIcon,
  OpenIDCardRenderer,
  expandObject,
  resolveDesign,
  type DCAttrItem,
} from '../../openid-card-design'

type Props = StackScreenProps<DeliveryStackParams, Screens.OpenIDCredentialOffer>

const OpenIDCredentialOffer: React.FC<Props> = ({ navigation, route }) => {
  // FIXME: change params to accept credential id to avoid 'non-serializable' warnings
  const { credential } = route.params
  const isPendingCredentialOffer =
    (credential as unknown as OpenId4VciPendingCredentialOffer)?.type === 'OpenId4VciPendingCredentialOffer'
  const pendingOffer = isPendingCredentialOffer
    ? (credential as unknown as OpenId4VciPendingCredentialOffer)
    : undefined
  const requiresTxCode = !!pendingOffer?.txCode || !!pendingOffer?.userPinRequired
  const issuedCredential = isPendingCredentialOffer
    ? undefined
    : (credential as W3cCredentialRecord | OpenBadgeCredentialRecord | JsonLdCredentialRecord)

  const credentialDisplay = issuedCredential ? getCredentialForDisplay(issuedCredential) : undefined
  const display = credentialDisplay?.display

  const pendingResolvedOffer = pendingOffer?.resolvedCredentialOffer
  const pendingConfigId = pendingResolvedOffer ? getCredentialConfigurationIds(pendingResolvedOffer)[0] : undefined
  const pendingSupported = pendingConfigId
    ? pendingResolvedOffer?.metadata?.credentialIssuerMetadata?.credential_configurations_supported?.[pendingConfigId]
    : undefined
  const pendingDisplayInfo = Array.isArray(pendingSupported?.display) ? pendingSupported.display[0] : undefined
  const pendingCredentialType = Array.isArray(pendingSupported?.credential_definition?.type)
    ? pendingSupported?.credential_definition?.type?.[pendingSupported.credential_definition.type.length - 1]
    : Array.isArray(pendingSupported?.credential_definition?.types)
      ? pendingSupported?.credential_definition?.types?.[pendingSupported.credential_definition.types.length - 1]
      : typeof pendingSupported?.vct === 'string'
        ? pendingSupported.vct
        : pendingConfigId
  const pendingDisplayName = pendingDisplayInfo?.name || pendingCredentialType || 'Credential'
  const pendingDisplayDescription = pendingDisplayInfo?.description
  const pendingPreviewAttributes = pendingOffer?.previewAttributes

  const { t } = useTranslation()
  const { agent } = useAgent()

  const [isRemoveModalDisplayed, setIsRemoveModalDisplayed] = useState(false)
  const [buttonsVisible, setButtonsVisible] = useState(true)
  const [acceptInFlight, setAcceptInFlight] = useState(false)
  const [acceptModalVisible, setAcceptModalVisible] = useState(false)
  const [txCode, setTxCode] = useState('')
  const [txCodeError, setTxCodeError] = useState<string | undefined>(undefined)
  const txCodeInputRef = useRef<TextInput>(null)
  const { acceptNewCredential } = useAcceptReplacement()
  const { declineByNewId } = useDeclineReplacement()

  // ---- Preview attribute resolution (legacy behaviour preserved) ------------
  // For pending offers: derive a labelled preview from offer.previewAttributes
  // or the issuer's credential_definition / claims metadata.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const credJson = ((issuedCredential as any)?.credential ?? {}) as Record<string, unknown>
  const pendingCredentialSubjectPreview = useMemo(() => {
    const mapLabel = (key: string, value: unknown) => {
      const labelSource =
        (pendingSupported?.credential_definition?.credentialSubject as Record<string, unknown> | undefined)?.[key] ??
        (pendingSupported?.claims as Record<string, unknown> | undefined)?.[key]
      const labelObj = labelSource && typeof labelSource === 'object' ? (labelSource as Record<string, unknown>) : undefined
      const displayName = Array.isArray(labelObj?.display)
        ? ((labelObj.display as Array<Record<string, unknown>>)[0]?.name as string | undefined)
        : undefined
      return [displayName || key, value]
    }
    if (pendingPreviewAttributes && typeof pendingPreviewAttributes === 'object') {
      return Object.fromEntries(
        Object.entries(pendingPreviewAttributes)
          .filter(([key]) => key !== 'id' && key !== 'sub' && key !== 'status')
          .map(([key, value]) => mapLabel(key, value))
      )
    }
    const credentialSubject = pendingSupported?.credential_definition?.credentialSubject
    if (credentialSubject && typeof credentialSubject === 'object' && !Array.isArray(credentialSubject)) {
      return Object.fromEntries(
        Object.entries(credentialSubject as Record<string, unknown>).map(([key, value]) => {
          const subjectObj = value && typeof value === 'object' ? (value as Record<string, unknown>) : undefined
          const displayName = Array.isArray(subjectObj?.display)
            ? ((subjectObj?.display as Array<Record<string, unknown>>)[0]?.name as string | undefined)
            : undefined
          const previewValue = subjectObj?.value ?? subjectObj?.default ?? subjectObj?.example ?? ''
          return [displayName || key, previewValue]
        })
      )
    }
    const claims = pendingSupported?.claims
    if (claims && typeof claims === 'object' && !Array.isArray(claims)) {
      return Object.fromEntries(
        Object.entries(claims as Record<string, unknown>).map(([key, value]) => {
          const claimObj = value && typeof value === 'object' ? (value as Record<string, unknown>) : undefined
          const displayName = Array.isArray(claimObj?.display)
            ? ((claimObj?.display as Array<Record<string, unknown>>)[0]?.name as string | undefined)
            : undefined
          const previewValue = claimObj?.value ?? claimObj?.default ?? claimObj?.example ?? ''
          return [displayName || key, previewValue]
        })
      )
    }
    return {}
  }, [pendingPreviewAttributes, pendingSupported])

  const subject = (Array.isArray(credJson.credentialSubject)
    ? (credJson.credentialSubject as unknown[])[0] ?? {}
    : credJson.credentialSubject ?? credentialDisplay?.attributes ?? pendingCredentialSubjectPreview ?? {}) as Record<string, unknown>

  const allRows = useMemo(() => flattenSubject(subject), [subject])
  const heroImageRow = allRows.find((r) => r.isImage && r.value)

  // Build DCAttrList items from the subject, preferring nested children for
  // objects so a deep credentialSubject reads cleanly on the dark UI.
  const attrItems: DCAttrItem[] = useMemo(() => expandObject(subject), [subject])

  const pendingIssuerHost = useMemo(() => {
    const issuer = pendingResolvedOffer?.metadata?.issuer
    if (!issuer) return undefined
    try {
      return new URL(issuer).host
    } catch {
      return issuer
    }
  }, [pendingResolvedOffer])

  const credentialName = isPendingCredentialOffer
    ? pendingDisplayName
    : credentialDisplay?.display?.name ?? credentialDisplay?.metadata?.type ?? 'Credential'
  const issuerName = isPendingCredentialOffer
    ? pendingIssuerHost ?? 'An issuer'
    : display?.issuer?.name ?? pendingIssuerHost ?? 'An issuer'
  const issuerDomain = isPendingCredentialOffer ? pendingIssuerHost : undefined
  const headline = `${issuerName} wants to issue you a ${credentialName}`
  const description = isPendingCredentialOffer ? pendingDisplayDescription : credentialDisplay?.display?.description

  const design = useMemo(
    () => (issuedCredential ? resolveDesign(issuedCredential as never) : null),
    [issuedCredential]
  )

  // ---- Handlers (unchanged from legacy) -------------------------------------

  const toggleDeclineModalVisible = () => setIsRemoveModalDisplayed(!isRemoveModalDisplayed)

  const handleDeclineTouched = async () => {
    if (isPendingCredentialOffer) {
      toggleDeclineModalVisible()
      navigation.getParent()?.navigate(Stacks.TabStack, {
        screen: TabStacks.HomeStack,
        params: { screen: Screens.Home },
      })
      return
    }
    if (!issuedCredential) return
    await handleSendNotification(NotificationEventType.CREDENTIAL_DELETED)
    await declineByNewId(issuedCredential.id)
    toggleDeclineModalVisible()
    navigation.getParent()?.navigate(Stacks.TabStack, {
      screen: TabStacks.HomeStack,
      params: { screen: Screens.Home },
    })
  }

  const navigateToTab = useCallback(
    (tabScreen: string, innerScreen: string) => {
      setAcceptModalVisible(false)
      const parent = navigation.getParent()
      if (!parent) return
      requestAnimationFrame(() => {
        parent.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [
              {
                name: Stacks.TabStack,
                state: {
                  index: 0,
                  routes: [{ name: tabScreen, state: { index: 0, routes: [{ name: innerScreen }] } }],
                },
              },
            ],
          })
        )
      })
    },
    [navigation]
  )

  const handleAcceptDone = useCallback(() => navigateToTab(TabStacks.CredentialStack, Screens.Credentials), [
    navigateToTab,
  ])
  const handleAcceptBackToHome = useCallback(() => navigateToTab(TabStacks.HomeStack, Screens.Home), [navigateToTab])

  const handleSendNotification = async (notificationEventType: NotificationEventType) => {
    try {
      if (
        temporaryMetaVanillaObject.notificationMetadata?.notificationId &&
        temporaryMetaVanillaObject.notificationMetadata?.notificationEndpoint &&
        temporaryMetaVanillaObject.tokenResponse?.accessToken
      ) {
        await agent?.modules.openId4VcHolder.sendNotification({
          accessToken: temporaryMetaVanillaObject.tokenResponse?.accessToken,
          notificationEvent: notificationEventType,
          notificationMetadata: {
            notificationId: temporaryMetaVanillaObject?.notificationMetadata?.notificationId,
            notificationEndpoint: temporaryMetaVanillaObject?.notificationMetadata?.notificationEndpoint,
          },
        })
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[Credential Offer] error sending notification', err)
    }
  }

  const handleAcceptTouched = async () => {
    if (!agent) return
    try {
      if (isPendingCredentialOffer && pendingOffer) {
        const trimmedCode = txCode.trim()
        const normalizedCode = trimmedCode.replace(/\s+/g, '').toUpperCase()
        const txCodeLength = pendingOffer.txCode?.length
        if (requiresTxCode) {
          if (!normalizedCode) {
            setTxCodeError('Transaction code is required.')
            return
          }
          if (!/^[A-Za-z0-9]+$/.test(normalizedCode)) {
            setTxCodeError('Transaction code must be alphanumeric.')
            return
          }
          if (txCodeLength && normalizedCode.length !== txCodeLength) {
            setTxCodeError(`Transaction code must be ${txCodeLength} characters.`)
            return
          }
        }
        setTxCodeError(undefined)
        setButtonsVisible(false)
        setAcceptInFlight(true)

        const resolvedCredentialOffer = pendingOffer.resolvedCredentialOffer
        const preAuthGrant =
          resolvedCredentialOffer.credentialOfferRequestWithBaseUrl?.credential_offer?.grants?.[
            'urn:ietf:params:oauth:grant-type:pre-authorized_code'
          ]
        if (preAuthGrant?.tx_code && /[A-Za-z]/.test(normalizedCode)) {
          preAuthGrant.tx_code.input_mode = 'text'
        }

        const tokenResponse = await acquirePreAuthorizedAccessToken({
          agent,
          resolvedCredentialOffer,
          txCode: normalizedCode || undefined,
        })
        const refreshToken = (tokenResponse as unknown as { refreshToken?: string }).refreshToken

        temporaryMetaVanillaObject.tokenResponse = tokenResponse

        const credentialRecord = await receiveCredentialFromOpenId4VciOffer({
          agent,
          resolvedCredentialOffer,
          tokenResponse,
        })

        const authServers = resolvedCredentialOffer.metadata.credentialIssuerMetadata.authorization_servers
        const credentialIssuer = resolvedCredentialOffer.metadata.issuer
        const authServer = credentialIssuer
        const configID = getCredentialConfigurationIds(resolvedCredentialOffer)?.[0]
        const tokenEndpoint = resolvedCredentialOffer.metadata.token_endpoint
        const issuerMetadata = resolvedCredentialOffer.metadata.credentialIssuerMetadata
        const credentialEndpoint = resolvedCredentialOffer.metadata.credential_endpoint

        if (refreshToken && authServer && configID) {
          setRefreshCredentialMetadata(credentialRecord, {
            authServer,
            tokenEndpoint,
            refreshToken,
            issuerMetadataCache: {
              credential_issuer: credentialIssuer,
              credential_endpoint: credentialEndpoint,
              token_endpoint: tokenEndpoint,
              authorization_servers: authServers,
              credential_configurations_supported: issuerMetadata?.credential_configurations_supported,
            },
            credentialIssuer,
            credentialConfigurationId: configID,
            lastCheckedAt: Date.now(),
            lastCheckResult: RefreshStatus.Valid,
            attemptCount: 0,
            resolvedCredentialOffer,
          })
        }

        await acceptNewCredential(credentialRecord)
        await handleSendNotification(NotificationEventType.CREDENTIAL_ACCEPTED)
        setAcceptInFlight(false)
        setAcceptModalVisible(true)
        return
      }

      if (!issuedCredential) return
      setAcceptInFlight(true)
      await acceptNewCredential(issuedCredential)
      await handleSendNotification(NotificationEventType.CREDENTIAL_ACCEPTED)
      setAcceptInFlight(false)
      setAcceptModalVisible(true)
    } catch (err: unknown) {
      setButtonsVisible(true)
      setAcceptInFlight(false)
      const error = new BifoldError(t('Error.Title1024'), t('Error.Message1024'), (err as Error)?.message ?? err, 1024)
      DeviceEventEmitter.emit(EventTypes.ERROR_ADDED, error)
    }
  }

  // ---- Render ---------------------------------------------------------------

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={DC_PALETTE.bgGrad as unknown as string[]}
        locations={[0, 0.55, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView edges={['top', 'bottom', 'left', 'right']} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} testID={testIdWithKey('CredentialOfferScreen')}>
        <View style={styles.pill}>
          <Text style={styles.pillText}>INCOMING OFFER</Text>
        </View>
        <Text style={styles.headline} testID={testIdWithKey('HeaderText')}>
          {headline}
        </Text>

        <View style={styles.heroSection}>
          {design && issuedCredential ? (
            <OpenIDCardRenderer credentialRecord={issuedCredential as never} design={design} mode="full" />
          ) : (
            <FallbackCard name={credentialName} description={description} heroImageUrl={heroImageRow?.value} />
          )}
        </View>

        <View style={styles.issuerCard}>
          <View style={styles.issuerAvatar}>
            <Text style={styles.issuerAvatarText}>{initials(issuerName)}</Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.issuerName} testID={testIdWithKey('IssuerName')} numberOfLines={1}>
              {issuerName}
            </Text>
            {issuerDomain ? (
              <Text style={styles.issuerSub} numberOfLines={1}>
                {issuerDomain}
              </Text>
            ) : null}
          </View>
          <DCIcon name="verified" size={18} color={DC_PALETTE.accent} />
        </View>

        {isPendingCredentialOffer && requiresTxCode ? (
          <View style={styles.txCodeCard}>
            <Text style={styles.txCodeLabel}>Transaction code</Text>
            <TextInput
              ref={txCodeInputRef}
              style={styles.txCodeInput}
              value={txCode}
              onChangeText={(v) => {
                setTxCode(v)
                if (txCodeError) setTxCodeError(undefined)
              }}
              placeholder="Enter transaction code"
              placeholderTextColor={DC_PALETTE.subMuted}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={pendingOffer?.txCode?.length}
              returnKeyType="done"
              autoFocus={requiresTxCode}
              testID={testIdWithKey('TxCode')}
            />
            {pendingOffer?.txCode?.description ? (
              <Text style={styles.txCodeHelp}>{pendingOffer.txCode.description}</Text>
            ) : null}
            {txCodeError ? <Text style={styles.txCodeError}>{txCodeError}</Text> : null}
          </View>
        ) : null}

        {attrItems.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>
              {isPendingCredentialOffer ? "YOU'LL RECEIVE (PREVIEW)" : "YOU'LL RECEIVE"}
            </Text>
            <DCAttrList items={attrItems} />
          </View>
        ) : isPendingCredentialOffer ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>YOU'LL RECEIVE</Text>
            <View style={styles.previewBox}>
              <Text style={styles.previewText}>
                This issuer didn't include a preview. Attributes will appear after acceptance.
              </Text>
            </View>
          </View>
        ) : null}

        <DCActionRow
          primaryLabel={t('Global.Accept')}
          primaryIcon="check"
          onPrimary={handleAcceptTouched}
          primaryLoading={acceptInFlight}
          primaryDisabled={!buttonsVisible}
          secondaryLabel={t('Global.Decline')}
          onSecondary={toggleDeclineModalVisible}
        />
      </ScrollView>

      <CredentialOfferAccept
        visible={acceptModalVisible}
        credentialId={''}
        confirmationOnly={true}
        onDone={handleAcceptDone}
        onBackToHome={handleAcceptBackToHome}
      />
      <CommonRemoveModal
        usage={ModalUsage.CredentialOfferDecline}
        visible={isRemoveModalDisplayed}
        onSubmit={handleDeclineTouched}
        onCancel={toggleDeclineModalVisible}
        extraDetails={display?.issuer?.name || t('ContactDetails.AContact')}
      />
      </SafeAreaView>
    </View>
  )
}

const FallbackCard: React.FC<{
  name: string
  description?: string
  heroImageUrl?: string
}> = ({ name, description, heroImageUrl }) => (
  <View style={fallbackStyles.card}>
    {heroImageUrl ? (
      <View style={fallbackStyles.heroImageWrap}>
        <Text style={fallbackStyles.heroImagePlaceholder}>{name.charAt(0).toUpperCase()}</Text>
      </View>
    ) : null}
    <Text style={fallbackStyles.cardTitle} numberOfLines={2}>
      {name}
    </Text>
    {description ? (
      <Text style={fallbackStyles.cardDescription} numberOfLines={3}>
        {description}
      </Text>
    ) : null}
  </View>
)

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0] ?? '').join('').toUpperCase() || '?'
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: DC_PALETTE.bg },
  safe: { flex: 1 },
  scroll: { padding: 18, paddingBottom: 36 },

  pill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(125,224,213,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(125,224,213,0.25)',
    marginTop: 6,
    marginBottom: 12,
  },
  pillText: { color: DC_PALETTE.accent, fontSize: 11, fontWeight: '700', letterSpacing: 1.2 },

  headline: { color: '#FFFFFF', fontSize: 22, fontWeight: '700', lineHeight: 28 },

  heroSection: { marginTop: 18, marginBottom: 4 },

  issuerCard: {
    marginTop: 14,
    padding: 14,
    backgroundColor: DC_PALETTE.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: DC_PALETTE.cardBorder,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  issuerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  issuerAvatarText: { color: DC_PALETTE.bg, fontWeight: '700', fontSize: 14 },
  issuerName: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  issuerSub: { color: DC_PALETTE.muted, fontSize: 12, marginTop: 2 },

  txCodeCard: {
    marginTop: 18,
    padding: 14,
    backgroundColor: DC_PALETTE.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: DC_PALETTE.cardBorder,
  },
  txCodeLabel: { color: '#FFFFFF', fontSize: 12, fontWeight: '600', marginBottom: 8, letterSpacing: 0.4 },
  txCodeInput: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#FFFFFF',
    backgroundColor: 'rgba(255,255,255,0.04)',
    fontSize: 15,
    letterSpacing: 1.2,
  },
  txCodeHelp: { color: DC_PALETTE.muted, fontSize: 11, marginTop: 6 },
  txCodeError: { color: DC_PALETTE.danger, fontSize: 12, marginTop: 6 },

  section: { marginTop: 22 },
  sectionLabel: {
    color: DC_PALETTE.subMuted,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  previewBox: {
    padding: 14,
    backgroundColor: DC_PALETTE.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: DC_PALETTE.cardBorder,
  },
  previewText: { color: DC_PALETTE.muted, fontSize: 12.5, lineHeight: 18 },
})

const fallbackStyles = StyleSheet.create({
  card: {
    backgroundColor: DC_PALETTE.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: DC_PALETTE.cardBorder,
    padding: 22,
    alignItems: 'flex-start',
    minHeight: 160,
    justifyContent: 'center',
  },
  heroImageWrap: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  heroImagePlaceholder: { color: '#FFFFFF', fontSize: 24, fontWeight: '700' },
  cardTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: '700', lineHeight: 28 },
  cardDescription: { color: DC_PALETTE.muted, fontSize: 13, marginTop: 6, lineHeight: 18 },
})

export default OpenIDCredentialOffer
