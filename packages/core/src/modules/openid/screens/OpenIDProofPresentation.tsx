import { useAgent } from '@credo-ts/react-hooks'
import { StackScreenProps } from '@react-navigation/stack'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DeviceEventEmitter } from 'react-native'

import { Attribute } from '@bifold/oca/build/legacy'
import { MdocRecord, SdJwtVcRecord, W3cCredentialRecord } from '@credo-ts/core'
import { OpenBadgeCredentialRecord } from '@ajna-inc/openbadges'
import { JsonLdCredentialRecord } from '../jsonLd/JsonLdCredentialRecord'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import Button, { ButtonType } from '../../../components/buttons/Button'
import OpenIDUnsatisfiedProofRequest from '../components/OpenIDUnsatisfiedProofRequest'
import { CredentialCard } from '../../../components/misc'
import CommonRemoveModal from '../../../components/modals/CommonRemoveModal'
import { EventTypes } from '../../../constants'
import { useTheme } from '../../../contexts/theme'
import ScreenLayout from '../../../layout/ScreenLayout'
import ProofRequestAccept from '../../../screens/ProofRequestAccept'
import { BifoldError } from '../../../types/error'
import { DeliveryStackParams, Screens, Stacks, TabStacks } from '../../../types/navigators'
import { ModalUsage } from '../../../types/remove'
import { buildFieldsFromW3cCredsCredential } from '../../../utils/oca'
import { testIdWithKey } from '../../../utils/testable'
import { useOpenIDCredentials } from '../context/OpenIDCredentialRecordProvider'
import { getCredentialForDisplay } from '../display'
import {
  formatDifPexCredentialsForRequest,
  FormattedSelectedCredentialEntry,
  FormattedSubmissionEntry,
} from '../displayProof'
import { shareProof } from '../resolverProof'
import { isMdocProofRequest, isSdJwtProofRequest, isW3CProofRequest } from '../utils/utils'

type OpenIDProofPresentationProps = StackScreenProps<DeliveryStackParams, Screens.OpenIDProofPresentation>

type SatisfiedCredentialsFormat = {
  [inputDescriptorId: string]: {
    id: string
    claimFormat: string
  }[]
}

type SelectedCredentialsFormat = {
  [inputDescriptorId: string]: {
    id: string
    claimFormat: string
  }
}

const OpenIDProofPresentation: React.FC<OpenIDProofPresentationProps> = ({
  navigation,
  route: {
    params: { credential },
  },
}: OpenIDProofPresentationProps) => {
  const [declineModalVisible, setDeclineModalVisible] = useState(false)
  const [buttonsVisible, setButtonsVisible] = useState(true)
  const [acceptModalVisible, setAcceptModalVisible] = useState(false)
  const [credentialsRequested, setCredentialsRequested] = useState<
    Array<W3cCredentialRecord | SdJwtVcRecord | MdocRecord | OpenBadgeCredentialRecord | JsonLdCredentialRecord>
  >([])
  const [satistfiedCredentialsSubmission, setSatistfiedCredentialsSubmission] = useState<SatisfiedCredentialsFormat>()
  const [selectedCredentialsSubmission, setSelectedCredentialsSubmission] = useState<SelectedCredentialsFormat>()

  const {
    getW3CCredentialById,
    getSdJwtCredentialById,
    getMdocCredentialById,
    getOpenBadgeCredentialById,
    getJsonLdCredentialById,
  } = useOpenIDCredentials()

  const { ColorPalette, ListItems, TextTheme } = useTheme()
  const { t } = useTranslation()
  const { agent } = useAgent()

  const toggleDeclineModalVisible = () => setDeclineModalVisible(!declineModalVisible)

  const styles = StyleSheet.create({
    pageContent: {
      flexGrow: 1,
      justifyContent: 'space-between',
      padding: 10,
    },
    credentialsList: {
      marginTop: 20,
      justifyContent: 'space-between',
    },
    headerTextContainer: {
      paddingVertical: 16,
    },
    headerText: {
      ...ListItems.recordAttributeText,
      flexShrink: 1,
    },
    footerButton: {
      paddingVertical: 10,
    },
    cardContainer: {
      paddingHorizontal: 25,
      paddingVertical: 16,
      backgroundColor: ColorPalette.brand.secondaryBackground,
      marginBottom: 20,
    },
    cardAttributes: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      borderColor: ColorPalette.grayscale.lightGrey,
      borderWidth: 1,
      borderRadius: 8,
      padding: 8,
    },
    cardGroupContainer: {
      borderRadius: 8,
      borderWidth: 2,
      borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    cardGroupHeader: {
      padding: 8,
      marginVertical: 8,
    },
  })

  const submission = useMemo(
    () =>
      credential && credential.credentialsForRequest
        ? formatDifPexCredentialsForRequest(credential.credentialsForRequest)
        : undefined,
    [credential]
  )

  useEffect(() => {
    if (!submission) {
      // eslint-disable-next-line no-console
      console.log('[OID4VP-screen] submission is undefined')
      return
    }
    // eslint-disable-next-line no-console
    console.log(
      `[OID4VP-screen] submission: areAllSatisfied=${submission.areAllSatisfied}, entries.length=${submission.entries.length}, ` +
        `creds-per-entry=${submission.entries.map((e) => `${e.inputDescriptorId.slice(0, 8)}:${e.credentials.length}(sat=${e.isSatisfied})`).join(', ')}`
    )
  }, [submission])

  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log(
      `[OID4VP-screen] credentialsRequested.length=${credentialsRequested.length}, selectedCredentialsSubmission=${selectedCredentialsSubmission ? Object.keys(selectedCredentialsSubmission).length + ' keys' : 'undefined'}`
    )
  })

  //This should run only once when the screen is mounted
  useEffect(() => {
    if (!submission) return
    const creds = submission.entries.reduce((acc: SatisfiedCredentialsFormat, entry) => {
      acc[entry.inputDescriptorId] = entry.credentials.map((cred) => ({
        id: cred.id,
        claimFormat: cred.claimFormat,
      }))
      return acc
    }, {})
    setSatistfiedCredentialsSubmission(creds)
  }, [submission])

  //Fetch all credentials satisfying the proof
  useEffect(() => {
    async function fetchCreds() {
      if (!satistfiedCredentialsSubmission || satistfiedCredentialsSubmission.entries) {
        // eslint-disable-next-line no-console
        console.log(
          `[OID4VP-screen] fetchCreds early-return: sat=${!!satistfiedCredentialsSubmission}, sat.entries=${satistfiedCredentialsSubmission?.entries}`
        )
        return
      }
      // eslint-disable-next-line no-console
      console.log(
        `[OID4VP-screen] fetchCreds starting: ${Object.keys(satistfiedCredentialsSubmission).length} descriptor(s)`
      )
      const creds: Array<W3cCredentialRecord | SdJwtVcRecord | MdocRecord | OpenBadgeCredentialRecord | JsonLdCredentialRecord> = []

      for (const [inputDescriptorID, credIDs] of Object.entries(satistfiedCredentialsSubmission)) {
        for (const { id, claimFormat } of credIDs) {
          let credential:
            | W3cCredentialRecord
            | SdJwtVcRecord
            | MdocRecord
            | OpenBadgeCredentialRecord
            | JsonLdCredentialRecord
            | undefined
          if (isW3CProofRequest(claimFormat)) {
            // Credo's W3cCredentialRepository AND our JSON-LD / OpenBadge
            // repos all surface as `ldp_vc` to PEX. Try Credo first, then
            // fall back to our records — the augmenter only injects records
            // that aren't already in Credo's, so the IDs are disjoint.
            const w3c = await getW3CCredentialById(id).catch(() => undefined)
            const jsonLd = w3c ? undefined : await getJsonLdCredentialById(id).catch(() => undefined)
            const openBadge = w3c || jsonLd ? undefined : await getOpenBadgeCredentialById(id).catch(() => undefined)
            credential = w3c ?? jsonLd ?? openBadge
            // eslint-disable-next-line no-console
            console.log(
              `[OID4VP-screen] lookup id=${id.slice(0, 12)} fmt=${claimFormat} → w3c=${!!w3c} jsonLd=${!!jsonLd} openBadge=${!!openBadge}`
            )
          } else if (isSdJwtProofRequest(claimFormat)) {
            credential = await getSdJwtCredentialById(id)
          } else if (isMdocProofRequest(claimFormat)) {
            credential = await getMdocCredentialById(id)
          }
          if (credential && inputDescriptorID) {
            creds.push(credential)
          }
        }
      }
      // eslint-disable-next-line no-console
      console.log(`[OID4VP-screen] fetchCreds done: pushed ${creds.length} record(s)`)
      setCredentialsRequested(creds)
    }
    fetchCreds()
  }, [
    satistfiedCredentialsSubmission,
    getW3CCredentialById,
    getSdJwtCredentialById,
    getMdocCredentialById,
    getOpenBadgeCredentialById,
    getJsonLdCredentialById,
  ])

  //Once satisfied credentials are set and all credentials fetched, we select the first one of each submission to display on screen
  useEffect(() => {
    if (!satistfiedCredentialsSubmission || credentialsRequested?.length <= 0) return

    const creds = Object.entries(satistfiedCredentialsSubmission).reduce(
      (acc: SelectedCredentialsFormat, [inputDescriptorId, credentials]) => {
        acc[inputDescriptorId] = {
          id: credentials[0]?.id,
          claimFormat: credentials?.[0]?.claimFormat,
        }
        return acc
      },
      {}
    )
    setSelectedCredentialsSubmission(creds)
  }, [satistfiedCredentialsSubmission, credentialsRequested])

  const { verifierName } = useMemo(() => {
    return { verifierName: credential?.verifierHostName }
  }, [credential])

  const handleAcceptTouched = async () => {
    try {
      if (!agent || !credential.credentialsForRequest || !selectedCredentialsSubmission) {
        return
      }
      await shareProof({
        agent,
        authorizationRequest: credential.authorizationRequest,
        credentialsForRequest: credential.credentialsForRequest,
        selectedCredentials: selectedCredentialsSubmission,
      })
      setAcceptModalVisible(true)
    } catch (err: unknown) {
      setButtonsVisible(true)
      const details = (() => {
        const maybe = err as { code?: string; message?: string }
        return maybe?.code ? `[${maybe.code}] ${maybe?.message ?? ''}` : (err as Error)?.message ?? err
      })()
      const error = new BifoldError(t('Error.Title1027'), t('Error.Message1027'), details, 1027)
      DeviceEventEmitter.emit(EventTypes.ERROR_ADDED, error)
    }
  }

  const handleDeclineTouched = async () => {
    toggleDeclineModalVisible()
    navigation.getParent()?.navigate(Stacks.TabStack, {
      screen: TabStacks.HomeStack,
      params: { screen: Screens.Home },
    })
  }

  const handleDismiss = async () => {
    navigation.getParent()?.navigate(Stacks.TabStack, {
      screen: TabStacks.HomeStack,
      params: { screen: Screens.Home },
    })
  }

  // Re-construct the selected credentials object based on user alt credential
  const onCredChange = ({
    inputDescriptorID,
    id,
    claimFormat,
  }: {
    inputDescriptorID: string
    id: string
    claimFormat: string
  }) => {
    setSelectedCredentialsSubmission((prev) => ({
      ...prev,
      [inputDescriptorID]: {
        id,
        claimFormat,
      },
    }))
  }

  const handleAltCredChange = useCallback(
    (inputDescriptorID: string, selectedCredID: string, inputDescriptor: string) => {
      const submittionEntries = submission?.entries.find((entry) => entry.inputDescriptorId === inputDescriptor)
      const credsForEntry = submittionEntries?.credentials

      if (!credsForEntry) return

      navigation.navigate(Screens.OpenIDProofCredentialSelect, {
        inputDescriptorID: inputDescriptorID,
        selectedCredID: selectedCredID,
        altCredIDs: credsForEntry.map((cred) => {
          return {
            id: cred.id,
            claimFormat: cred.claimFormat,
          }
        }),
        onCredChange: onCredChange,
      })
    },
    [submission, navigation]
  )

  const renderHeader = () => {
    if (!selectedCredentialsSubmission) return
    return (
      <View style={styles.headerTextContainer}>
        <Text style={styles.headerText} testID={testIdWithKey('HeaderText')}>
          <Text style={TextTheme.normal}>{t('ProofRequest.ReceiveProofTitle')}</Text>
          {'\n'}
          <Text style={TextTheme.title}>{verifierName ? verifierName : ''}</Text>
        </Text>
      </View>
    )
  }

  const renderCard = (
    sub: FormattedSubmissionEntry,
    selectedCredential: FormattedSelectedCredentialEntry,
    hasMultipleCreds: boolean
  ) => {
    const credential = credentialsRequested.find((c) => c.id === selectedCredential.id)
    if (!credential) {
      return null
    }
    const credentialDisplay = getCredentialForDisplay(credential)
    const requestedAttributes = selectedCredential.requestedAttributes
    const fields = buildFieldsFromW3cCredsCredential(credentialDisplay, requestedAttributes)
    return (
      <CredentialCard
        credential={credential as W3cCredentialRecord | SdJwtVcRecord | MdocRecord | OpenBadgeCredentialRecord | JsonLdCredentialRecord}
        displayItems={fields as Attribute[]}
        hasAltCredentials={hasMultipleCreds}
        onPress={() => {}}
        handleAltCredChange={() => {
          handleAltCredChange(sub.inputDescriptorId, selectedCredential.id, sub.inputDescriptorId)
        }}
      />
    )
  }

  const renderBody = () => {
    if (submission && !submission.areAllSatisfied) {
      return (
        <OpenIDUnsatisfiedProofRequest
          credentialName={submission?.name}
          requestPurpose={submission?.purpose}
          verifierName={verifierName}
        />
      )
    }

    if (!selectedCredentialsSubmission || !submission) return

    return (
      <View style={styles.credentialsList}>
        {Object.entries(selectedCredentialsSubmission).map(([inputDescriptorId, credentialSimplified], i) => {
          //TODO: Support multiplae credentials

          const globalSubmissionName = submission.name
          const globalSubmissionPurpose = submission.purpose
          const correspondingSubmission = submission.entries?.find((s) => s.inputDescriptorId === inputDescriptorId)
          const submissionName = correspondingSubmission?.name
          const submissionPurpose = correspondingSubmission?.purpose
          const isSatisfied = correspondingSubmission?.isSatisfied
          const credentialSubmittion = correspondingSubmission?.credentials.find(
            (s) => s.id === credentialSimplified.id
          )
          const requestedAttributes = credentialSubmittion?.requestedAttributes

          const name = submissionName || globalSubmissionName || undefined
          const purpose = submissionPurpose || globalSubmissionPurpose || undefined

          return (
            <View key={i}>
              <View style={styles.cardContainer}>
                <View style={styles.cardGroupContainer}>
                  {name && purpose && (
                    <View style={styles.cardGroupHeader}>
                      <Text style={TextTheme.bold}>{name}</Text>
                      <Text style={TextTheme.labelTitle}>{purpose}</Text>
                    </View>
                  )}
                  {isSatisfied && requestedAttributes
                    ? renderCard(
                        correspondingSubmission,
                        credentialSubmittion,
                        correspondingSubmission.credentials.length > 1
                      )
                    : null}
                </View>
              </View>
            </View>
          )
        })}
      </View>
    )
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

  const footer = () => {
    if (submission && !submission.areAllSatisfied) {
      return (
        <View
          style={{
            paddingHorizontal: 25,
            paddingVertical: 16,
            paddingBottom: 26,
            backgroundColor: ColorPalette.brand.secondaryBackground,
          }}
        >
          {footerButton(
            t('Global.Dismiss'),
            handleDismiss,
            ButtonType.Primary,
            testIdWithKey('DismissCredentialOffer'),
            t('Global.Dismiss')
          )}
        </View>
      )
    }

    return (
      <View
        style={{
          paddingHorizontal: 25,
          paddingVertical: 16,
          paddingBottom: 26,
          backgroundColor: ColorPalette.brand.secondaryBackground,
        }}
      >
        {selectedCredentialsSubmission && Object.keys(selectedCredentialsSubmission).length > 0 ? (
          <>
            {footerButton(
              t('Global.Send'),
              handleAcceptTouched,
              ButtonType.Primary,
              testIdWithKey('AcceptCredentialOffer'),
              t('Global.Send')
            )}
            {footerButton(
              t('Global.Decline'),
              toggleDeclineModalVisible,
              ButtonType.Secondary,
              testIdWithKey('DeclineCredentialOffer'),
              t('Global.Decline')
            )}
          </>
        ) : (
          <>
            {footerButton(
              t('Global.Dismiss'),
              handleDismiss,
              ButtonType.Primary,
              testIdWithKey('DismissCredentialOffer'),
              t('Global.Dismiss')
            )}
          </>
        )}
      </View>
    )
  }

  return (
    <ScreenLayout screen={Screens.OpenIDCredentialDetails}>
      <ScrollView>
        <View style={styles.pageContent}>
          {renderHeader()}
          {renderBody()}
        </View>
      </ScrollView>
      {footer()}

      <ProofRequestAccept visible={acceptModalVisible} proofId={''} confirmationOnly={true} />
      <CommonRemoveModal
        usage={ModalUsage.ProofRequestDecline}
        visible={declineModalVisible}
        onSubmit={handleDeclineTouched}
        onCancel={toggleDeclineModalVisible}
      />
    </ScreenLayout>
  )
}

export default OpenIDProofPresentation
