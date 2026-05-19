import { CredentialState } from '@credo-ts/core'
import { useCredentialById, useAgent } from '@credo-ts/react-hooks'
import { CommonActions, useNavigation } from '@react-navigation/native'
import React, { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AccessibilityInfo, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import Animated from 'react-native-reanimated'
import LinearGradient from 'react-native-linear-gradient'
import { SafeAreaView } from 'react-native-safe-area-context'

import SafeAreaModal from '../components/modals/SafeAreaModal'
import { Screens, Stacks, TabStacks } from '../types/navigators'
import { testIdWithKey } from '../utils/testable'
import { TOKENS, useServices } from '../container-api'
import { ensureCredentialMetadata } from '../utils/credential'
import {
  DC_PALETTE,
  DCHeroSpinner,
  DCIcon,
} from '../modules/openid-card-design'
import { usePulse, usePulseRing } from '../modules/openid-card-design/animations'

enum DeliveryStatus {
  Pending,
  Completed,
  Declined,
}

export interface CredentialOfferAcceptProps {
  visible: boolean
  credentialId: string
  confirmationOnly?: boolean
  workflowInstanceId?: string
  onDone?: () => void
  onBackToHome?: () => void
}

const CredentialOfferAccept: React.FC<CredentialOfferAcceptProps> = ({
  visible,
  credentialId,
  confirmationOnly,
  workflowInstanceId,
  onDone,
  onBackToHome,
}) => {
  const { t } = useTranslation()
  const { agent } = useAgent()
  const [shouldShowDelayMessage, setShouldShowDelayMessage] = useState(false)
  const [credentialDeliveryStatus, setCredentialDeliveryStatus] = useState<DeliveryStatus>(DeliveryStatus.Pending)
  const [timerDidFire, setTimerDidFire] = useState(false)
  const [timer, setTimer] = useState<NodeJS.Timeout>()
  const credential = useCredentialById(credentialId)
  const navigation = useNavigation()
  const [{ connectionTimerDelay }, logger] = useServices([TOKENS.CONFIG, TOKENS.UTIL_LOGGER])
  const connTimerDelay = connectionTimerDelay ?? 10000

  // Only run the pulse + ring while the modal is visible. Mounted-but-hidden
  // modals were ticking Reanimated worklets for the whole session.
  const { style: pulseStyle } = usePulse(0.06, 1800, visible)
  const { style: ringStyle } = usePulseRing(1800, visible)

  if (!credential && !confirmationOnly) {
    throw new Error('Unable to fetch credential from Credo')
  }

  // Reset the parent navigator (MainStack) to a single TabStack route.
  const resetParentToTab = useCallback(
    (tabScreen: string, innerScreen: string, innerParams?: Record<string, unknown>) => {
      const parent = navigation.getParent()
      if (!parent) return
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
                    state: { index: 0, routes: [{ name: innerScreen, params: innerParams }] },
                  },
                ],
              },
            },
          ],
        })
      )
    },
    [navigation]
  )

  const onBackToHomeTouched = useCallback(() => {
    if (onBackToHome) {
      onBackToHome()
      return
    }
    if (workflowInstanceId) {
      navigation.getParent()?.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [
            {
              name: Stacks.ContactStack,
              state: {
                index: 0,
                routes: [{ name: Screens.WorkflowDetails, params: { instanceId: workflowInstanceId } }],
              },
            },
          ],
        })
      )
    } else {
      resetParentToTab(TabStacks.HomeStack, Screens.Home)
    }
  }, [navigation, workflowInstanceId, resetParentToTab, onBackToHome])

  const onDoneTouched = useCallback(() => {
    if (onDone) {
      onDone()
      return
    }
    if (workflowInstanceId) {
      navigation.getParent()?.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [
            {
              name: Stacks.ContactStack,
              state: {
                index: 0,
                routes: [{ name: Screens.WorkflowDetails, params: { instanceId: workflowInstanceId } }],
              },
            },
          ],
        })
      )
    } else {
      resetParentToTab(TabStacks.CredentialStack, Screens.Credentials)
    }
  }, [navigation, workflowInstanceId, resetParentToTab, onDone])

  useEffect(() => {
    if (!credential) return
    if (credential.state === CredentialState.CredentialReceived || credential.state === CredentialState.Done) {
      timer && clearTimeout(timer)
      setCredentialDeliveryStatus(DeliveryStatus.Completed)
      const restoreMetadata = async () => {
        if (agent) {
          try {
            await ensureCredentialMetadata(credential, agent, undefined, logger)
          } catch (error) {
            logger?.warn('Failed to restore credential metadata', { error: error as Error })
          }
        }
      }
      restoreMetadata()
    }
  }, [credential, timer, agent, logger])

  useEffect(() => {
    if (confirmationOnly) {
      timer && clearTimeout(timer)
      setCredentialDeliveryStatus(DeliveryStatus.Completed)
    }
  }, [confirmationOnly, timer])

  useEffect(() => {
    if (timerDidFire || credentialDeliveryStatus !== DeliveryStatus.Pending || !visible) return
    const t1 = setTimeout(() => {
      setShouldShowDelayMessage(true)
      setTimerDidFire(true)
    }, connTimerDelay)
    setTimer(t1)
    return () => {
      t1 && clearTimeout(t1)
    }
  }, [timerDidFire, credentialDeliveryStatus, visible, connTimerDelay])

  useEffect(() => {
    if (shouldShowDelayMessage && credentialDeliveryStatus !== DeliveryStatus.Completed) {
      AccessibilityInfo.announceForAccessibility(t('Connection.TakingTooLong'))
    }
  }, [shouldShowDelayMessage, credentialDeliveryStatus, t])

  const isPending = credentialDeliveryStatus === DeliveryStatus.Pending
  const isCompleted = credentialDeliveryStatus === DeliveryStatus.Completed

  return (
    <SafeAreaModal
      visible={visible}
      transparent={true}
      animationType="fade"
      statusBarTranslucent
      presentationStyle="overFullScreen"
    >
      <View style={styles.root}>
        <LinearGradient
          colors={DC_PALETTE.bgGrad as unknown as string[]}
          locations={[0, 0.55, 1]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <SafeAreaView edges={['top', 'bottom', 'left', 'right']} style={styles.safe}>
          <View style={styles.body}>
            <View style={styles.heroArea}>
              {isCompleted ? (
                <>
                  <Animated.View style={[styles.ring, ringStyle]} />
                  <Animated.View style={[styles.successHero, pulseStyle]}>
                    <DCIcon name="check" size={44} color={DC_PALETTE.bg} />
                  </Animated.View>
                </>
              ) : (
                <>
                  <DCHeroSpinner color={DC_PALETTE.accent} size={100} />
                  <View style={styles.pendingIcon}>
                    <DCIcon name="check" size={28} color={DC_PALETTE.accent} />
                  </View>
                </>
              )}
            </View>

            <Text style={styles.title} testID={testIdWithKey(isCompleted ? 'CredentialAddedToYourWallet' : 'CredentialOnTheWay')}>
              {isCompleted ? t('CredentialOffer.CredentialAddedToYourWallet') : t('CredentialOffer.CredentialOnTheWay')}
            </Text>

            {isCompleted ? (
              <Text style={styles.subtitle}>The credential is now stored in your wallet and ready to use.</Text>
            ) : (
              <Text style={styles.subtitle}>Saving your credential securely.</Text>
            )}

            {shouldShowDelayMessage && isPending ? (
              <View style={styles.slowCard}>
                <Text style={styles.slowTitle}>{t('Connection.TakingTooLong')}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.actions}>
            {isPending ? (
              <TouchableOpacity
                style={styles.secondary}
                onPress={onBackToHomeTouched}
                accessibilityLabel={t('Loading.BackToHome')}
                testID={testIdWithKey('BackToHome')}
              >
                <Text style={styles.secondaryText}>{t('Loading.BackToHome')}</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.primary}
                onPress={onDoneTouched}
                accessibilityLabel={t('Global.Done')}
                testID={testIdWithKey('Done')}
              >
                <Text style={styles.primaryText}>{t('Global.Done')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </SafeAreaView>
      </View>
    </SafeAreaModal>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: DC_PALETTE.bg },
  safe: { flex: 1 },
  body: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 80,
    alignItems: 'center',
  },
  heroArea: {
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    borderColor: DC_PALETTE.accent,
  },
  successHero: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: DC_PALETTE.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: DC_PALETTE.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  pendingIcon: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(125,224,213,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(125,224,213,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    marginTop: 28,
    textAlign: 'center',
  },
  subtitle: {
    color: DC_PALETTE.muted,
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 12,
  },
  slowCard: {
    marginTop: 24,
    padding: 14,
    backgroundColor: DC_PALETTE.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: DC_PALETTE.cardBorder,
    width: '100%',
  },
  slowTitle: { color: '#FFFFFF', fontSize: 13, fontWeight: '600', textAlign: 'center' },
  actions: { paddingHorizontal: 18, paddingBottom: 16 },
  primary: {
    backgroundColor: DC_PALETTE.accent,
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: { color: DC_PALETTE.bg, fontSize: 15, fontWeight: '700' },
  secondary: {
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  secondaryText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
})

export default CredentialOfferAccept
