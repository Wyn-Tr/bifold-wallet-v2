import { useAgent } from '@credo-ts/react-hooks'
import { StackScreenProps } from '@react-navigation/stack'
import React, { useEffect, useState } from 'react'
import { ActivityIndicator, Linking, ScrollView, StyleSheet, Text, View } from 'react-native'

import { useTheme } from '../contexts/theme'
import ScreenLayout from '../layout/ScreenLayout'
import { runVcApiExchange, VcApiExchangeOutcome } from '../modules/vcApi/exchangeRunner'
import { RootStackParams, Screens } from '../types/navigators'
import { testIdWithKey } from '../utils/testable'

type VcApiExchangeProps = StackScreenProps<RootStackParams, Screens.VcApiExchange>

const VcApiExchange: React.FC<VcApiExchangeProps> = ({ navigation, route }) => {
  const { exchangeUrl, initialResponse } = route.params
  const { agent } = useAgent()
  const { ColorPalette, TextTheme } = useTheme()
  const [outcome, setOutcome] = useState<VcApiExchangeOutcome | null>(null)

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: ColorPalette.brand.primaryBackground,
      padding: 24,
    },
    centered: {
      alignItems: 'center',
      justifyContent: 'center',
      flex: 1,
    },
    label: {
      ...TextTheme.headingThree,
      color: ColorPalette.brand.text,
      marginBottom: 12,
    },
    body: {
      ...TextTheme.normal,
      color: ColorPalette.brand.text,
    },
    error: {
      ...TextTheme.normal,
      color: ColorPalette.brand.primary,
    },
  })

  useEffect(() => {
    let cancelled = false
    if (!agent) return

    const run = async () => {
      const result = await runVcApiExchange({ agent, exchangeUrl, initialResponse })
      if (cancelled) return
      setOutcome(result)

      if (result.kind === 'received-credential') {
        // Replace the in-progress screen with the badge details so the user
        // doesn't see the spinner flash on success.
        navigation.replace(Screens.OpenBadgeDetails, { credentialId: result.record.id })
      } else if (result.kind === 'redirect') {
        Linking.openURL(result.url).catch(() => undefined)
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [agent, exchangeUrl, initialResponse, navigation])

  if (!outcome) {
    return (
      <ScreenLayout screen={Screens.VcApiExchange}>
        <View style={[styles.container, styles.centered]}>
          <ActivityIndicator size="large" color={ColorPalette.brand.primary} />
          <Text style={[styles.body, { marginTop: 16 }]} testID={testIdWithKey('VcApiInProgress')}>
            Running VC-API exchange…
          </Text>
        </View>
      </ScreenLayout>
    )
  }

  return (
    <ScreenLayout screen={Screens.VcApiExchange}>
      <ScrollView style={styles.container}>
        <Text style={styles.label}>VC-API exchange</Text>
        {outcome.kind === 'received-credential' && (
          <Text style={styles.body} testID={testIdWithKey('VcApiSuccess')}>
            Credential received and stored.
          </Text>
        )}
        {outcome.kind === 'redirect' && (
          <Text style={styles.body} testID={testIdWithKey('VcApiRedirect')}>
            Redirecting…
          </Text>
        )}
        {outcome.kind === 'done' && (
          <Text style={styles.body} testID={testIdWithKey('VcApiDone')}>
            Exchange completed with no further action.
          </Text>
        )}
        {outcome.kind === 'unsupported-presentation-request' && (
          <Text style={styles.body} testID={testIdWithKey('VcApiUnsupported')}>
            This QR is a verification request. Verifier flow is not yet supported in this build.
          </Text>
        )}
        {outcome.kind === 'error' && (
          <Text style={styles.error} testID={testIdWithKey('VcApiError')}>
            Exchange failed: {outcome.message}
          </Text>
        )}
      </ScrollView>
    </ScreenLayout>
  )
}

export default VcApiExchange
