import React, { useCallback, useEffect, useRef, useState } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import LinearGradient from 'react-native-linear-gradient'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'

import { testIdWithKey } from '../../utils/testable'
import { DC_PALETTE, DCHeroSpinner, DCIcon } from '../../modules/openid-card-design'

export const LoadingPlaceholderWorkflowType = {
  Connection: 'Connection',
  ReceiveOffer: 'ReceiveOffer',
  ProofRequested: 'ProofRequested',
} as const

type LoadingPlaceholderProps = {
  workflowType: (typeof LoadingPlaceholderWorkflowType)[keyof typeof LoadingPlaceholderWorkflowType]
  timeoutDurationInMs?: number
  loadingProgressPercent?: number
  onCancelTouched?: () => void
  onTimeoutTriggered?: () => void
  testID?: string
}

const LoadingPlaceholder: React.FC<LoadingPlaceholderProps> = ({
  workflowType,
  timeoutDurationInMs = 10000,
  loadingProgressPercent = 0,
  onCancelTouched,
  onTimeoutTriggered,
  testID,
}) => {
  const { t } = useTranslation()
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const [overtime, setOvertime] = useState(false)

  useEffect(() => {
    if (timeoutDurationInMs === 0) return
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      setOvertime(true)
      if (onTimeoutTriggered) onTimeoutTriggered()
    }, timeoutDurationInMs)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [timeoutDurationInMs, onTimeoutTriggered])

  const heroIcon = useCallback(() => {
    switch (workflowType) {
      case LoadingPlaceholderWorkflowType.Connection:
        return 'verified'
      case LoadingPlaceholderWorkflowType.ProofRequested:
        return 'share'
      case LoadingPlaceholderWorkflowType.ReceiveOffer:
        return 'check'
    }
  }, [workflowType])

  const title = useCallback(() => {
    switch (workflowType) {
      case LoadingPlaceholderWorkflowType.Connection:
        return t('LoadingPlaceholder.Connecting')
      case LoadingPlaceholderWorkflowType.ProofRequested:
        return t('LoadingPlaceholder.ProofRequest')
      case LoadingPlaceholderWorkflowType.ReceiveOffer:
        return t('LoadingPlaceholder.CredentialOffer')
    }
  }, [workflowType, t])

  const subtitle = useCallback(() => {
    switch (workflowType) {
      case LoadingPlaceholderWorkflowType.ProofRequested:
        return t('LoadingPlaceholder.YourRequest')
      case LoadingPlaceholderWorkflowType.ReceiveOffer:
        return t('LoadingPlaceholder.YourOffer')
      default:
        return t('LoadingPlaceholder.Connecting')
    }
  }, [workflowType, t])

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={DC_PALETTE.bgGrad as unknown as string[]}
        locations={[0, 0.55, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView
        style={styles.safeArea}
        testID={testID ?? testIdWithKey('LoadingPlaceholder')}
        edges={['top', 'bottom', 'left', 'right']}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.heroArea}>
            <DCHeroSpinner color={DC_PALETTE.accent} size={100} />
            <View style={styles.heroIcon}>
              <DCIcon name={heroIcon()} size={28} color={DC_PALETTE.accent} />
            </View>
          </View>

          <Text style={styles.title}>{title()}</Text>
          <Text style={styles.subtitle}>{subtitle()}</Text>

          {loadingProgressPercent > 0 ? (
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.min(loadingProgressPercent, 100)}%` }]} />
            </View>
          ) : null}

          {overtime ? (
            <View style={styles.slowCard}>
              <Text style={styles.slowTitle} testID={testIdWithKey('SlowLoadTitle')}>
                {t('LoadingPlaceholder.SlowLoadingTitle')}
              </Text>
              <Text style={styles.slowBody} testID={testIdWithKey('SlowLoadBody')}>
                {t('LoadingPlaceholder.SlowLoadingBody')}
              </Text>
            </View>
          ) : null}
        </ScrollView>

        {onCancelTouched ? (
          <TouchableOpacity
            style={styles.cancel}
            onPress={onCancelTouched}
            accessibilityRole="button"
            accessibilityLabel={t('Global.Cancel')}
            testID={testIdWithKey('Cancel')}
          >
            <Text style={styles.cancelText}>{t('Global.Cancel')}</Text>
          </TouchableOpacity>
        ) : null}
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: DC_PALETTE.bg },
  safeArea: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    alignItems: 'center',
  },
  heroArea: {
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroIcon: {
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
    fontSize: 22,
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
  },
  progressTrack: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
    marginTop: 30,
  },
  progressFill: {
    height: '100%',
    backgroundColor: DC_PALETTE.accent,
    borderRadius: 2,
  },
  slowCard: {
    marginTop: 32,
    padding: 16,
    backgroundColor: DC_PALETTE.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: DC_PALETTE.cardBorder,
    width: '100%',
  },
  slowTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '700', marginBottom: 6 },
  slowBody: { color: DC_PALETTE.muted, fontSize: 13, lineHeight: 18 },
  cancel: {
    margin: 20,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
})

export default LoadingPlaceholder
