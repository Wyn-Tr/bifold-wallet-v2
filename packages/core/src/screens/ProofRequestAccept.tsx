import { ProofState } from '@credo-ts/core'
import { useProofById } from '@credo-ts/react-hooks'
import { CommonActions, useNavigation } from '@react-navigation/native'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollView, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import Button, { ButtonType } from '../components/buttons/Button'
import SafeAreaModal from '../components/modals/SafeAreaModal'
import { useAnimatedComponents } from '../contexts/animated-components'
import { useTheme } from '../contexts/theme'
import { Screens, Stacks, TabStacks } from '../types/navigators'
import { testIdWithKey } from '../utils/testable'
import { ThemedText } from '../components/texts/ThemedText'

export interface ProofRequestAcceptProps {
  visible: boolean
  proofId: string
  confirmationOnly?: boolean
  connectionId?: string
  onDismiss?: () => void
}

const ProofRequestAccept: React.FC<ProofRequestAcceptProps> = ({ visible, proofId, confirmationOnly, connectionId, onDismiss }) => {
  const { t } = useTranslation()
  const [proofDeliveryStatus, setProofDeliveryStatus] = useState<ProofState>(ProofState.RequestReceived)
  const proof = useProofById(proofId)
  const navigation = useNavigation()
  const { ColorPalette, TextTheme } = useTheme()
  const { SendingProof, SentProof } = useAnimatedComponents()

  const styles = StyleSheet.create({
    container: {
      height: '100%',
      backgroundColor: ColorPalette.brand.modalPrimaryBackground,
      padding: 20,
    },
    image: {
      marginTop: 20,
    },
    messageContainer: {
      alignItems: 'center',
    },
    messageText: {
      fontWeight: TextTheme.normal.fontWeight,
      textAlign: 'center',
      marginTop: 30,
    },
    controlsContainer: {
      marginTop: 'auto',
      margin: 20,
    },
    delayMessageText: {
      textAlign: 'center',
      marginTop: 20,
    },
  })

  if (!proof && !confirmationOnly) {
    throw new Error('Unable to fetch proof from Credo')
  }

  const onBackToHomeTouched = () => {
    // Use callback if provided (allows parent to handle modal dismissal and navigation)
    if (onDismiss) {
      onDismiss()
      return
    }

    // Fallback: navigate directly (for backwards compatibility)
    if (connectionId) {
      navigation.dispatch(
        CommonActions.navigate({
          name: Stacks.ContactStack,
          params: {
            screen: Screens.Chat,
            params: { connectionId },
          },
        })
      )
    } else {
      navigation.getParent()?.navigate(Stacks.TabStack, {
        screen: TabStacks.HomeStack,
        params: { screen: Screens.Home },
      })
    }
  }

  useEffect(() => {
    if (confirmationOnly) {
      setProofDeliveryStatus(ProofState.PresentationSent)
      return
    }

    if (!proof) return

    if (proof.state === proofDeliveryStatus) {
      return
    }

    if (proof.state === ProofState.Done || proof.state === ProofState.PresentationSent) {
      setProofDeliveryStatus(proof.state)
    }
  }, [proof, proofDeliveryStatus, confirmationOnly])

  return (
    <SafeAreaModal visible={visible} transparent={true} animationType={'none'}>
      <SafeAreaView style={{ backgroundColor: ColorPalette.brand.modalPrimaryBackground }}>
        <ScrollView style={styles.container}>
          <View style={styles.messageContainer}>
            {proofDeliveryStatus === ProofState.RequestReceived && (
              <ThemedText
                variant="modalHeadingThree"
                style={styles.messageText}
                testID={testIdWithKey('SendingProofRequest')}
              >
                {t('ProofRequest.SendingTheInformationSecurely')}
              </ThemedText>
            )}

            {(proofDeliveryStatus === ProofState.PresentationSent || proofDeliveryStatus === ProofState.Done) && (
              <ThemedText
                variant="modalHeadingThree"
                style={styles.messageText}
                testID={testIdWithKey('SentProofRequest')}
              >
                {t('ProofRequest.InformationSentSuccessfully')}
              </ThemedText>
            )}
          </View>

          <View style={[styles.image, { minHeight: 250, alignItems: 'center', justifyContent: 'flex-end' }]}>
            {proofDeliveryStatus === ProofState.RequestReceived && <SendingProof />}
            {(proofDeliveryStatus === ProofState.PresentationSent || proofDeliveryStatus === ProofState.Done) && (
              <SentProof />
            )}
          </View>
        </ScrollView>

        <View style={styles.controlsContainer}>
          <View>
            <Button
              title={t('Global.Back')}
              accessibilityLabel={t('Global.Back')}
              testID={testIdWithKey('Back')}
              onPress={onBackToHomeTouched}
              buttonType={ButtonType.ModalSecondary}
            />
          </View>
        </View>
      </SafeAreaView>
    </SafeAreaModal>
  )
}

export default ProofRequestAccept
