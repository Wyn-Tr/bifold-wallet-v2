import React, { useEffect, useState } from 'react'
import { StackScreenProps } from '@react-navigation/stack'
import { RootStackParams, Screens } from '../../../types/navigators'
import { getCredentialForDisplay } from '../display'
import CommonRemoveModal from '../../../components/modals/CommonRemoveModal'
import { ModalUsage } from '../../../types/remove'
import { DeviceEventEmitter, StyleSheet, Text, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { testIdWithKey } from '../../../utils/testable'
import { useTheme } from '../../../contexts/theme'
import { BifoldError } from '../../../types/error'
import { EventTypes } from '../../../constants'
import { useAgent } from '@credo-ts/react-hooks'
import RecordRemove from '../../../components/record/RecordRemove'
import { useOpenIDCredentials } from '../context/OpenIDCredentialRecordProvider'
import { CredentialOverlay, Field } from '@bifold/oca/build/legacy'
import { OpenIDCredentialType, W3cCredentialDisplay } from '../types'
import { TOKENS, useServices } from '../../../container-api'
import { BrandingOverlay } from '@bifold/oca'
import Record from '../../../components/record/Record'
import { SdJwtVcRecord, W3cCredentialRecord } from '@credo-ts/core'
import { OpenBadgeCredentialRecord } from '@ajna-inc/openbadges'
import { buildFieldsFromW3cCredsCredential, buildOverlayFromW3cCredential } from '../../../utils/oca'
import CredentialDetailSecondaryHeader from '../../../components/views/CredentialDetailSecondaryHeader'
import CredentialCardLogo from '../../../components/views/CredentialCardLogo'
import CredentialDetailPrimaryHeader from '../../../components/views/CredentialDetailPrimaryHeader'
import ScreenLayout from '../../../layout/ScreenLayout'
import OpenIDCredentialCard from '../components/OpenIDCredentialCard'

export enum OpenIDCredScreenMode {
  offer,
  details,
}

type OpenIDCredentialDetailsProps = StackScreenProps<RootStackParams, Screens.OpenIDCredentialDetails>

const paddingHorizontal = 24
const paddingVertical = 16

const OpenIDCredentialDetails: React.FC<OpenIDCredentialDetailsProps> = ({ navigation, route }) => {
  const { credentialId, type } = route.params

  const [credential, setCredential] = useState<
    W3cCredentialRecord | SdJwtVcRecord | OpenBadgeCredentialRecord | undefined
  >(undefined)
  const [credentialDisplay, setCredentialDisplay] = useState<W3cCredentialDisplay>()
  const { t, i18n } = useTranslation()
  const { ColorPalette, TextTheme } = useTheme()
  const { agent } = useAgent()
  const { removeCredential, getW3CCredentialById, getSdJwtCredentialById, getOpenBadgeCredentialById } =
    useOpenIDCredentials()
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

  const styles = StyleSheet.create({
    container: {
      backgroundColor: overlay.brandingOverlay?.primaryBackgroundColor,
      display: 'flex',
    },
    cardContainer: {
      paddingHorizontal: 10,
      paddingVertical: 30,
    },
  })

  useEffect(() => {
    if (!agent) return

    const fetchCredential = async () => {
      if (credentialRemoved) return
      try {
        let record: SdJwtVcRecord | W3cCredentialRecord | OpenBadgeCredentialRecord | undefined

        if (type === OpenIDCredentialType.SdJwtVc) {
          record = await getSdJwtCredentialById(credentialId)
        } else if (type === OpenIDCredentialType.OpenBadge) {
          record = await getOpenBadgeCredentialById(credentialId)
        } else {
          record = await getW3CCredentialById(credentialId)
        }

        setCredential(record)
      } catch (error) {
        // credential not found for id, display an error
        DeviceEventEmitter.emit(
          EventTypes.ERROR_ADDED,
          new BifoldError(t('Error.Title1033'), t('Error.Message1033'), t('CredentialDetails.CredentialNotFound'), 1035)
        )
      }
    }
    fetchCredential()
  }, [
    credentialId,
    type,
    getSdJwtCredentialById,
    getW3CCredentialById,
    getOpenBadgeCredentialById,
    agent,
    t,
    credentialRemoved,
  ])

  useEffect(() => {
    if (!credential) return

    try {
      const credDisplay = getCredentialForDisplay(credential)
      setCredentialDisplay(credDisplay)
      if (type === OpenIDCredentialType.SdJwtVc) {
        // eslint-disable-next-line no-console
        console.log(
          '[OID4VC][SDJWT][details] mapped payload',
          JSON.stringify({
            credentialId,
            attributeKeys: Object.keys(credDisplay.attributes || {}),
            displayName: credDisplay.display?.name,
            metadataType: credDisplay.metadata?.type,
          })
        )
      }
    } catch (error) {
      DeviceEventEmitter.emit(
        EventTypes.ERROR_ADDED,
        new BifoldError(t('Error.Title1033'), t('Error.Message1033'), t('CredentialDetails.CredentialNotFound'), 1034)
      )
    }
  }, [credential, credentialId, t, type])

  useEffect(() => {
    if (!credentialDisplay || !bundleResolver || !i18n || !credentialDisplay.display) {
      return
    }

    const resolveOverlay = async () => {
      const builtFallbackFields = buildFieldsFromW3cCredsCredential(credentialDisplay)
      setFallbackFields(builtFallbackFields)

      if (type === OpenIDCredentialType.SdJwtVc) {
        // eslint-disable-next-line no-console
        console.log(
          '[OID4VC][SDJWT][details] fallback fields',
          JSON.stringify({ credentialId, count: builtFallbackFields.length })
        )
      }

      try {
        const resolvedOverlay = await buildOverlayFromW3cCredential({
          credentialDisplay,
          language: i18n.language,
          resolver: bundleResolver,
        })

        const ocaCount = resolvedOverlay.presentationFields?.length ?? 0
        if (type === OpenIDCredentialType.SdJwtVc) {
          // eslint-disable-next-line no-console
          console.log('[OID4VC][SDJWT][details] oca fields', JSON.stringify({ credentialId, count: ocaCount }))
        }

        setOverlay({
          ...resolvedOverlay,
          presentationFields: ocaCount > 0 ? resolvedOverlay.presentationFields : builtFallbackFields,
        })
      } catch {
        if (type === OpenIDCredentialType.SdJwtVc) {
          // eslint-disable-next-line no-console
          console.log('[OID4VC][SDJWT][details] oca fields', JSON.stringify({ credentialId, count: 0, failed: true }))
        }
        setOverlay((prev) => ({
          ...prev,
          presentationFields: builtFallbackFields,
        }))
      }
    }

    resolveOverlay()
  }, [credentialDisplay, bundleResolver, i18n, credentialId, type])

  const finalFields = (overlay.presentationFields && overlay.presentationFields.length > 0
    ? overlay.presentationFields
    : fallbackFields) || []

  useEffect(() => {
    if (type === OpenIDCredentialType.SdJwtVc) {
      // eslint-disable-next-line no-console
      console.log('[OID4VC][SDJWT][details] rendered fields', JSON.stringify({ credentialId, count: finalFields.length }))
    }
  }, [type, credentialId, finalFields.length])

  const toggleDeclineModalVisible = () => {
    if (credentialRemoved) {
      return
    }
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
      const error = new BifoldError(t('Error.Title1025'), t('Error.Message1025'), (err as Error)?.message ?? err, 1025)
      DeviceEventEmitter.emit(EventTypes.ERROR_ADDED, error)
    }
  }

  //To be used only in specific cases where consistency with anoncreds needed
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const legacyHeader = () => {
    if (!credentialDisplay) return null

    return (
      <View style={styles.container}>
        <CredentialDetailSecondaryHeader overlay={overlay} />
        <CredentialCardLogo overlay={overlay} />
        <CredentialDetailPrimaryHeader overlay={overlay} />
      </View>
    )
  }

  const renderOpenIdCard = () => {
    if (!credentialDisplay) return null
    return <OpenIDCredentialCard credentialDisplay={credentialDisplay} credentialRecord={credential} />
  }

  const header = () => {
    return <View style={styles.cardContainer}>{renderOpenIdCard()}</View>
  }

  const footer = () => {
    if (!credentialDisplay) return null
    return (
      <View style={{ marginBottom: 50 }}>
        <View
          style={{
            backgroundColor: ColorPalette.brand.secondaryBackground,
            marginTop: paddingVertical,
            paddingHorizontal,
            paddingVertical,
          }}
        >
          <Text testID={testIdWithKey('IssuerName')}>
            <Text style={[TextTheme.title]}>{t('CredentialDetails.IssuedBy') + ' '}</Text>
            <Text style={[TextTheme.normal]}>
              {credentialDisplay.display.issuer.name || t('ContactDetails.AContact')}
            </Text>
          </Text>
        </View>
        <RecordRemove onRemove={toggleDeclineModalVisible} />
      </View>
    )
  }

  return (
    <ScreenLayout screen={Screens.OpenIDCredentialDetails}>
      <Record fields={finalFields} header={header} footer={footer} />
      <CommonRemoveModal
        usage={ModalUsage.CredentialRemove}
        visible={isRemoveModalDisplayed}
        onSubmit={handleDeclineTouched}
        onCancel={toggleDeclineModalVisible}
      />
    </ScreenLayout>
  )
}

export default OpenIDCredentialDetails
