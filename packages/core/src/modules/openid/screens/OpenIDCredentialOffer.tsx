import { W3cCredentialRecord } from '@credo-ts/core'
import { OpenBadgeCredentialRecord } from '@ajna-inc/openbadges'
import { JsonLdCredentialRecord } from '../jsonLd/JsonLdCredentialRecord'
import { useAgent } from '@credo-ts/react-hooks'
import { CommonActions } from '@react-navigation/native'
import { StackScreenProps } from '@react-navigation/stack'
import React, { useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DeviceEventEmitter, Image, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Button, { ButtonType } from '../../../components/buttons/Button'
import CommonRemoveModal from '../../../components/modals/CommonRemoveModal'
import { flattenSubject } from '../utils/flattenSubject'
import { EventTypes } from '../../../constants'
import { useTheme } from '../../../contexts/theme'
import CredentialOfferAccept from '../../../screens/CredentialOfferAccept'
import { BifoldError } from '../../../types/error'
import { DeliveryStackParams, Screens, Stacks, TabStacks } from '../../../types/navigators'
import { ModalUsage } from '../../../types/remove'
import { testIdWithKey } from '../../../utils/testable'
import OpenIDCredentialCard from '../components/OpenIDCredentialCard'
import { getCredentialForDisplay } from '../display'
import { NotificationEventType } from '../notification'
import { temporaryMetaVanillaObject, setRefreshCredentialMetadata } from '../metadata'
import { useAcceptReplacement } from '../hooks/useAcceptReplacement'
import { useDeclineReplacement } from '../hooks/useDeclineReplacement'
import { acquirePreAuthorizedAccessToken, receiveCredentialFromOpenId4VciOffer } from '../offerResolve'
import { getCredentialConfigurationIds } from '../utils/utils'
import { RefreshStatus } from '../refresh/types'
import { OpenId4VciPendingCredentialOffer } from '../types'

type OpenIDCredentialDetailsProps = StackScreenProps<DeliveryStackParams, Screens.OpenIDCredentialOffer>

const OpenIDCredentialOffer: React.FC<OpenIDCredentialDetailsProps> = ({ navigation, route }) => {
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
  const pendingDisplayInfo = Array.isArray(pendingSupported?.display)
    ? pendingSupported.display[0]
    : undefined
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

  // console.log('$$ ====> Credential Display', JSON.stringify(credentialDisplay))
  const { t } = useTranslation()
  const { ColorPalette, TextTheme } = useTheme()
  const { agent } = useAgent()

  const [isRemoveModalDisplayed, setIsRemoveModalDisplayed] = useState(false)
  const [buttonsVisible, setButtonsVisible] = useState(true)
  const [acceptModalVisible, setAcceptModalVisible] = useState(false)
  const [txCode, setTxCode] = useState('')
  const [txCodeError, setTxCodeError] = useState<string | undefined>(undefined)
  const txCodeInputRef = useRef<TextInput>(null)
  const { acceptNewCredential } = useAcceptReplacement()
  const { declineByNewId } = useDeclineReplacement()

  const styles = StyleSheet.create({
    headerTextContainer: {
      paddingHorizontal: 25,
      paddingVertical: 16,
    },
    headerText: {
      ...TextTheme.normal,
      flexShrink: 1,
    },
    txCodeContainer: {
      marginBottom: 16,
    },
    txCodeLabel: {
      ...TextTheme.normal,
      marginBottom: 6,
    },
    txCodeInput: {
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: TextTheme.normal.color,
      borderColor: ColorPalette.brand.secondaryBackground,
      backgroundColor: ColorPalette.brand.secondaryBackground,
    },
    txCodeHelpText: {
      ...TextTheme.label,
      marginTop: 6,
    },
    txCodeErrorText: {
      ...TextTheme.label,
      marginTop: 6,
      color: ColorPalette.semantic.error,
    },
    footerButton: {
      paddingTop: 10,
    },
    attributesSection: {
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
    heroImageSection: {
      alignItems: 'center',
      paddingHorizontal: 24,
      paddingTop: 4,
      paddingBottom: 16,
    },
    heroImageLabel: {
      ...TextTheme.labelSubtitle,
      color: ColorPalette.grayscale.mediumGrey,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      alignSelf: 'flex-start',
      marginBottom: 8,
    },
    heroImage: {
      width: '100%',
      height: 220,
      borderRadius: 12,
      backgroundColor: ColorPalette.grayscale.lightGrey,
    },
    plainTitleBlock: {
      paddingHorizontal: 24,
      paddingTop: 4,
      paddingBottom: 16,
    },
    plainTitleText: {
      ...TextTheme.headingTwo,
      color: ColorPalette.brand.text,
      marginBottom: 4,
    },
    plainTitleDescription: {
      ...TextTheme.normal,
      color: ColorPalette.grayscale.mediumGrey,
    },
    fallbackInfoSection: {
      paddingHorizontal: 24,
      paddingVertical: 18,
      backgroundColor: ColorPalette.brand.secondaryBackground,
      marginTop: 12,
    },
    fallbackInfoText: {
      ...TextTheme.normal,
      color: ColorPalette.brand.text,
    },
    summarySection: {
      paddingHorizontal: 24,
      paddingVertical: 18,
      backgroundColor: ColorPalette.brand.secondaryBackground,
      marginTop: 12,
    },
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 6,
    },
    summaryLabel: {
      ...TextTheme.label,
      color: ColorPalette.grayscale.mediumGrey,
      flex: 1,
    },
    summaryValue: {
      ...TextTheme.normal,
      color: ColorPalette.brand.text,
      flex: 2,
      textAlign: 'right',
    },
    previewStatusBox: {
      marginTop: 12,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      backgroundColor: ColorPalette.grayscale.white,
    },
    previewStatusTitle: {
      ...TextTheme.labelSubtitle,
      color: ColorPalette.brand.text,
      marginBottom: 4,
    },
    previewStatusText: {
      ...TextTheme.normal,
      color: ColorPalette.grayscale.mediumGrey,
    },
    pendingValueText: {
      ...TextTheme.normal,
      color: ColorPalette.grayscale.mediumGrey,
      fontStyle: 'italic',
      flex: 2,
      textAlign: 'right',
    },
  })

  // Pull credentialSubject straight from the credential JSON for raw-JSON
  // record types (OpenBadge / JsonLd). Fall back to the OCA-derived attributes
  // for SD-JWT / W3C records, which credentialDisplay.attributes already
  // populates correctly.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const credJson = ((issuedCredential as any)?.credential ?? {}) as Record<string, unknown>
  const pendingCredentialSubjectPreview = (() => {
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
  })()

  const subject = (Array.isArray(credJson.credentialSubject)
    ? (credJson.credentialSubject as unknown[])[0] ?? {}
    : credJson.credentialSubject ?? credentialDisplay?.attributes ?? pendingCredentialSubjectPreview ?? {}) as Record<string, unknown>
  const allRows = flattenSubject(subject)
  // Promote the first image attribute to a hero section at the top of the
  // attributes view — base64 / data-URL images are unreadable when dumped as
  // a value cell. Remaining images (if any) still render inline.
  const heroImageRow = allRows.find((r) => r.isImage && r.value)
  const subjectRows = heroImageRow ? allRows.filter((r) => r !== heroImageRow) : allRows

  const pendingClaimLabelRows = (() => {
    if (!isPendingCredentialOffer) return [] as Array<{ key: string; label: string; value: string }>

    const claimSource =
      (pendingSupported?.claims && typeof pendingSupported.claims === 'object'
        ? (pendingSupported.claims as Record<string, unknown>)
        : undefined) ??
      (pendingSupported?.credential_definition?.credentialSubject &&
      typeof pendingSupported.credential_definition.credentialSubject === 'object'
        ? (pendingSupported.credential_definition.credentialSubject as Record<string, unknown>)
        : undefined)

    if (!claimSource) return [] as Array<{ key: string; label: string; value: string }>

    return Object.entries(claimSource)
      .filter(([key]) => key !== 'id' && key !== 'sub' && key !== 'status')
      .map(([key, value]) => {
        const obj = value && typeof value === 'object' ? (value as Record<string, unknown>) : undefined
        const displayName = Array.isArray(obj?.display)
          ? ((obj?.display as Array<Record<string, unknown>>)[0]?.name as string | undefined)
          : undefined
        const exampleValue = obj?.value ?? obj?.default ?? obj?.example ?? ''
        return {
          key,
          label: displayName || key,
          value: typeof exampleValue === 'string' || typeof exampleValue === 'number' ? String(exampleValue) : '',
        }
      })
  })()

  const pendingFallbackRows =
    subjectRows.length > 0
      ? []
      : pendingClaimLabelRows.length > 0
        ? pendingClaimLabelRows
        : pendingDisplayName
          ? [{ key: 'credential', label: 'Credential', value: pendingDisplayName }]
          : []

  const hasPendingPreviewValues = !!(
    pendingPreviewAttributes &&
    Object.values(pendingPreviewAttributes).some(
      (value) => value !== undefined && value !== null && String(value).trim().length > 0
    )
  )
  const hasMetadataOnlyPreview = !hasPendingPreviewValues && (subjectRows.length > 0 || pendingFallbackRows.length > 0)
  const previewStatusLabel = isPendingCredentialOffer
    ? hasPendingPreviewValues
      ? 'Preview available'
      : hasMetadataOnlyPreview
        ? 'Field names available'
        : 'Preview unavailable'
    : undefined
  const previewStatusDescription = isPendingCredentialOffer
    ? hasPendingPreviewValues
      ? 'This issuer provided values you can review before acceptance.'
      : hasMetadataOnlyPreview
        ? 'This issuer shared field names, but values will appear after issuance.'
        : 'This issuer did not provide preview data before issuance.'
    : undefined

  const pendingIssuerHost = (() => {
    const issuer = pendingResolvedOffer?.metadata?.issuer
    if (!issuer) return 'Unknown issuer'
    try {
      return new URL(issuer).host
    } catch {
      return issuer
    }
  })()

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

    if (!issuedCredential) {
      return
    }

    await handleSendNotification(NotificationEventType.CREDENTIAL_DELETED)
    await declineByNewId(issuedCredential.id)
    toggleDeclineModalVisible()
    navigation.getParent()?.navigate(Stacks.TabStack, {
      screen: TabStacks.HomeStack,
      params: { screen: Screens.Home },
    })
  }

  // Hide the "Credential Added" modal first, then on the next tick reset the
  // parent navigator. Doing both in the same tick (or letting the modal call
  // dispatch itself) caused a visible flicker — the modal would unmount at
  // the same moment MainStack tore down DeliveryStack, briefly exposing the
  // offer screen in between.
  const navigateToTab = useCallback(
    (tabScreen: string, innerScreen: string) => {
      setAcceptModalVisible(false)
      const parent = navigation.getParent()
      if (!parent) return
      // requestAnimationFrame lets React commit the visibility update before
      // the navigation reset replaces the surrounding screen.
      requestAnimationFrame(() => {
        parent.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [
              {
                name: Stacks.TabStack,
                state: {
                  index: 0,
                  routes: [
                    {
                      name: tabScreen,
                      state: {
                        index: 0,
                        routes: [{ name: innerScreen }],
                      },
                    },
                  ],
                },
              },
            ],
          })
        )
      })
    },
    [navigation]
  )

  const handleAcceptDone = useCallback(() => {
    navigateToTab(TabStacks.CredentialStack, Screens.Credentials)
  }, [navigateToTab])

  const handleAcceptBackToHome = useCallback(() => {
    navigateToTab(TabStacks.HomeStack, Screens.Home)
  }, [navigateToTab])

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
      console.warn('[Credential Offer] error sending notification', err)
    }
  }

  const handleAcceptTouched = async () => {
    if (!agent) {
      return
    }
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
        setAcceptModalVisible(true)
        return
      }

      if (!issuedCredential) {
        return
      }

      await acceptNewCredential(issuedCredential)
      await handleSendNotification(NotificationEventType.CREDENTIAL_ACCEPTED)
      setAcceptModalVisible(true)
    } catch (err: unknown) {
      setButtonsVisible(true)
      const error = new BifoldError(t('Error.Title1024'), t('Error.Message1024'), (err as Error)?.message ?? err, 1024)
      DeviceEventEmitter.emit(EventTypes.ERROR_ADDED, error)
    }
  }

  const footerButton = (
    title: string,
    buttonPress: () => void,
    buttonType: ButtonType,
    testID: string,
    accessibilityLabel: string
  ) => {
    return (
      <View style={styles.footerButton}>
        <Button
          title={title}
          accessibilityLabel={accessibilityLabel}
          testID={testID}
          buttonType={buttonType}
          onPress={buttonPress}
          disabled={!buttonsVisible}
        />
      </View>
    )
  }

  // Only render the OpenIDCredentialCard chrome when the credential has
  // actual brand styling — background colour, background image, or a logo.
  // Without any of those, the card is a 220px-tall empty box with the title
  // floating in a tiny header band, which leaves a huge blank gap before the
  // attributes. For unbranded credentials we render a clean title block
  // instead.
  const hasBrandedCard = !!(
    credentialDisplay?.display?.backgroundColor ||
    credentialDisplay?.display?.backgroundImage?.url ||
    credentialDisplay?.display?.logo?.url
  )

  const renderOpenIdCard = () => {
    if (!credentialDisplay || !issuedCredential) return null
    return (
      <OpenIDCredentialCard
        credentialDisplay={credentialDisplay}
        credentialRecord={issuedCredential as W3cCredentialRecord}
      />
    )
  }

  const header = () => {
    return (
      <>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerText} testID={testIdWithKey('HeaderText')}>
            <Text>{display?.issuer.name || t('ContactDetails.AContact')}</Text>{' '}
            {t('CredentialOffer.IsOfferingYouACredential')}
          </Text>
        </View>
        {issuedCredential && hasBrandedCard ? (
          <View style={{ marginHorizontal: 15, marginBottom: 16 }}>{renderOpenIdCard()}</View>
        ) : issuedCredential || isPendingCredentialOffer ? (
          <View style={styles.plainTitleBlock}>
            <Text style={styles.plainTitleText} testID={testIdWithKey('CredentialName')}>
              {issuedCredential
                ? credentialDisplay?.display?.name ?? credentialDisplay?.metadata?.type ?? 'Credential'
                : pendingDisplayName}
            </Text>
            {(issuedCredential ? credentialDisplay?.display?.description : pendingDisplayDescription) ? (
              <Text style={styles.plainTitleDescription}>
                {issuedCredential ? credentialDisplay?.display?.description : pendingDisplayDescription}
              </Text>
            ) : null}
          </View>
        ) : null}
        {isPendingCredentialOffer && (
          <View style={styles.summarySection}>
            <Text style={styles.sectionTitle}>Credential Summary</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Issuer</Text>
              <Text style={styles.summaryValue}>{pendingIssuerHost}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Configuration</Text>
              <Text style={styles.summaryValue}>{pendingConfigId || pendingCredentialType || 'Credential'}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Format</Text>
              <Text style={styles.summaryValue}>{pendingSupported?.format || 'unknown'}</Text>
            </View>
            <View style={styles.previewStatusBox}>
              <Text style={styles.previewStatusTitle}>{previewStatusLabel}</Text>
              <Text style={styles.previewStatusText}>{previewStatusDescription}</Text>
            </View>
          </View>
        )}
      </>
    )
  }

  const footer = () => {
    const paddingHorizontal = 24
    const paddingVertical = 16
    const paddingBottom = 26
    return (
      <View style={{ marginBottom: 50 }}>
        <View
          style={{
            paddingHorizontal: paddingHorizontal,
            paddingVertical: paddingVertical,
            paddingBottom: paddingBottom,
            backgroundColor: ColorPalette.brand.secondaryBackground,
          }}
        >
          {isPendingCredentialOffer && requiresTxCode && (
            <View style={styles.txCodeContainer}>
              <Text style={styles.txCodeLabel}>Transaction code</Text>
              <TextInput
                ref={txCodeInputRef}
                style={styles.txCodeInput}
                value={txCode}
                onChangeText={(value) => {
                  setTxCode(value)
                  if (txCodeError) {
                    setTxCodeError(undefined)
                  }
                }}
                placeholder="Enter transaction code"
                autoCapitalize="characters"
                autoCorrect={false}
                keyboardType="default"
                maxLength={pendingOffer?.txCode?.length}
                blurOnSubmit={false}
                returnKeyType="done"
                autoFocus={requiresTxCode}
                onBlur={() => {
                  const expectedLength = pendingOffer?.txCode?.length
                  if (!expectedLength) {
                    return
                  }
                  const currentLength = txCode.replace(/\s+/g, '').length
                  if (currentLength < expectedLength) {
                    setTimeout(() => txCodeInputRef.current?.focus(), 50)
                  }
                }}
              />
              {pendingOffer?.txCode?.description && (
                <Text style={styles.txCodeHelpText}>{pendingOffer.txCode.description}</Text>
              )}
              {txCodeError && <Text style={styles.txCodeErrorText}>{txCodeError}</Text>}
            </View>
          )}
          {footerButton(
            t('Global.Accept'),
            handleAcceptTouched,
            ButtonType.Primary,
            testIdWithKey('AcceptCredentialOffer'),
            t('Global.Accept')
          )}
          {footerButton(
            t('Global.Decline'),
            toggleDeclineModalVisible,
            ButtonType.Secondary,
            testIdWithKey('DeclineCredentialOffer'),
            t('Global.Decline')
          )}
        </View>
      </View>
    )
  }

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['bottom', 'left', 'right']}>
      <ScrollView>
        {header()}
        {heroImageRow?.value && (
          <View style={styles.heroImageSection}>
            <Text style={styles.heroImageLabel}>{heroImageRow.label}</Text>
            <Image
              source={{ uri: heroImageRow.value }}
              style={styles.heroImage}
              resizeMode="contain"
              testID={testIdWithKey(`Attribute-${heroImageRow.key}`)}
            />
          </View>
        )}
        {subjectRows.length > 0 ? (
          <View style={styles.attributesSection}>
            <Text style={styles.sectionTitle}>{isPendingCredentialOffer ? 'Credential Preview' : 'Attributes'}</Text>
            {subjectRows.map((row, idx) => {
              const isLast = idx === subjectRows.length - 1
              const indent = row.depth > 0 ? { paddingLeft: 16 * row.depth } : null
              if (row.isHeader) {
                return (
                  <View
                    key={row.key}
                    style={[styles.groupHeaderRow, indent, isLast ? styles.metaRowLast : null]}
                  >
                    <Text style={[styles.metaLabel, styles.groupHeaderLabel]}>{row.label}</Text>
                  </View>
                )
              }
              if (row.isImage && row.value) {
                return (
                  <View
                    key={row.key}
                    style={[styles.imageRow, indent, isLast ? styles.metaRowLast : null]}
                  >
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
              const showPendingPlaceholder =
                isPendingCredentialOffer && !hasPendingPreviewValues && (!row.value || row.value.trim().length === 0)
              return (
                <View
                  key={row.key}
                  style={[styles.metaRow, indent, isLast ? styles.metaRowLast : null]}
                >
                  <Text style={styles.metaLabel}>{row.label}</Text>
                  <Text
                    style={showPendingPlaceholder ? styles.pendingValueText : styles.metaValue}
                    testID={testIdWithKey(`Attribute-${row.key}`)}
                  >
                    {showPendingPlaceholder ? 'Available after acceptance' : row.value}
                  </Text>
                </View>
              )
            })}
          </View>
        ) : pendingFallbackRows.length > 0 ? (
          <View style={styles.attributesSection}>
            <Text style={styles.sectionTitle}>Credential Preview</Text>
            {pendingFallbackRows.map((row, idx) => {
              const isLast = idx === pendingFallbackRows.length - 1
              const showPendingPlaceholder = !row.value || row.value.trim().length === 0
              return (
                <View key={row.key} style={[styles.metaRow, isLast ? styles.metaRowLast : null]}>
                  <Text style={styles.metaLabel}>{row.label}</Text>
                  <Text
                    style={showPendingPlaceholder ? styles.pendingValueText : styles.metaValue}
                    testID={testIdWithKey(`Fallback-${row.key}`)}
                  >
                    {showPendingPlaceholder ? 'Available after acceptance' : row.value}
                  </Text>
                </View>
              )
            })}
          </View>
        ) : isPendingCredentialOffer ? (
          <View style={styles.fallbackInfoSection}>
            <Text style={styles.sectionTitle}>Attributes</Text>
            <Text style={styles.fallbackInfoText}>
              No preview attributes were provided in this credential offer or issuer metadata.
            </Text>
          </View>
        ) : null}
        {footer()}
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
  )
}

export default OpenIDCredentialOffer
