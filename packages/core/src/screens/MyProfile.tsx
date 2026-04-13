import { ConnectionType, DidExchangeState } from '@credo-ts/core'
import { useAgent } from '@credo-ts/react-hooks'
import React, { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Toast from 'react-native-toast-message'

import { ToastType } from '../components/toast/BaseToast'
import { ThemedText } from '../components/texts/ThemedText'
import { useTheme } from '../contexts/theme'
import { BifoldAgent } from '../utils/agent'
import { testIdWithKey } from '../utils/testable'

/**
 * Push the agent's own profile to every completed, non-mediator connection.
 * Errors on individual connections are swallowed so one broken peer does not
 * block the rest of the broadcast.
 */
async function broadcastProfile(agent: BifoldAgent): Promise<void> {
  const allConnections = await agent.connections.getAll()
  const targets = allConnections.filter(
    (c) => c.state === DidExchangeState.Completed && !c.connectionTypes.includes(ConnectionType.Mediator)
  )
  await Promise.allSettled(
    targets.map((c) => agent.modules.userProfile.sendUserProfile({ connectionId: c.id }))
  )
}

/**
 * Editor screen for the wallet's own user profile (sent to peers via the
 * DIDComm user-profile protocol). Reads/writes via the 2060 user-profile
 * module's `userProfile` API on the agent.
 *
 * Note: image upload is intentionally not included yet — bifold does not
 * currently ship with an image picker dependency. Users can clear an
 * existing picture below; setting a new picture can be added later.
 */
const MyProfile: React.FC = () => {
  const { t } = useTranslation()
  const { agent } = useAgent() as { agent: BifoldAgent | undefined }
  const { ColorPalette, Spacing, Inputs } = useTheme()

  const [displayName, setDisplayName] = useState('')
  const [description, setDescription] = useState('')
  const [preferredLanguage, setPreferredLanguage] = useState('')
  const [hasPicture, setHasPicture] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)

  const loadProfile = useCallback(async () => {
    if (!agent) return
    setLoading(true)
    try {
      const data = await agent.modules.userProfile.getUserProfileData()
      setDisplayName(data.displayName ?? '')
      setDescription(data.description ?? '')
      setPreferredLanguage(data.preferredLanguage ?? '')
      setHasPicture(
        typeof data.displayPicture === 'object' && !!data.displayPicture && !!data.displayPicture.base64
      )
    } catch (err) {
      Toast.show({ type: ToastType.Error, text1: t('MyProfile.SaveFailed') as string, text2: String(err) })
    } finally {
      setLoading(false)
    }
  }, [agent, t])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  const handleSave = useCallback(async () => {
    if (!agent) return
    setSaving(true)
    try {
      await agent.modules.userProfile.updateUserProfileData({
        displayName: displayName || undefined,
        description: description || undefined,
        preferredLanguage: preferredLanguage || undefined,
      })
      // Push the updated profile to every active peer (fire-and-forget).
      broadcastProfile(agent).catch((err) => {
        agent.config.logger.warn?.(`MyProfile: broadcast failed: ${String(err)}`)
      })
      Toast.show({ type: ToastType.Success, text1: t('MyProfile.Saved') as string })
    } catch (err) {
      Toast.show({ type: ToastType.Error, text1: t('MyProfile.SaveFailed') as string, text2: String(err) })
    } finally {
      setSaving(false)
    }
  }, [agent, displayName, description, preferredLanguage, t])

  const handleClearPicture = useCallback(async () => {
    if (!agent) return
    setSaving(true)
    try {
      await agent.modules.userProfile.updateUserProfileData({ displayPicture: '' })
      setHasPicture(false)
      broadcastProfile(agent).catch((err) => {
        agent.config.logger.warn?.(`MyProfile: broadcast failed: ${String(err)}`)
      })
      Toast.show({ type: ToastType.Success, text1: t('MyProfile.Saved') as string })
    } catch (err) {
      Toast.show({ type: ToastType.Error, text1: t('MyProfile.SaveFailed') as string, text2: String(err) })
    } finally {
      setSaving(false)
    }
  }, [agent, t])

  const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: ColorPalette.brand.primaryBackground },
    content: { padding: Spacing.md, gap: Spacing.md },
    label: { marginBottom: Spacing.xs },
    input: { ...Inputs.textInput },
    textarea: { ...Inputs.textInput, minHeight: 80, textAlignVertical: 'top' },
    button: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.lg,
      borderRadius: 12,
      marginTop: Spacing.md,
    },
    primaryButton: { backgroundColor: ColorPalette.brand.primary },
    dangerButton: { backgroundColor: '#FF3B30', marginTop: Spacing.sm },
    buttonText: { color: '#FFFFFF', fontWeight: '500', fontSize: 16 },
  })

  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View>
          <ThemedText variant="labelTitle" style={styles.label}>
            {t('MyProfile.DisplayName')}
          </ThemedText>
          <TextInput
            style={styles.input}
            value={displayName}
            onChangeText={setDisplayName}
            editable={!loading && !saving}
            testID={testIdWithKey('DisplayName')}
          />
        </View>

        <View>
          <ThemedText variant="labelTitle" style={styles.label}>
            {t('MyProfile.Description')}
          </ThemedText>
          <TextInput
            style={styles.textarea}
            value={description}
            onChangeText={setDescription}
            editable={!loading && !saving}
            multiline
            testID={testIdWithKey('Description')}
          />
        </View>

        <View>
          <ThemedText variant="labelTitle" style={styles.label}>
            {t('MyProfile.PreferredLanguage')}
          </ThemedText>
          <TextInput
            style={styles.input}
            value={preferredLanguage}
            onChangeText={setPreferredLanguage}
            editable={!loading && !saving}
            placeholder="en"
            testID={testIdWithKey('PreferredLanguage')}
          />
        </View>

        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={handleSave}
          disabled={loading || saving}
          testID={testIdWithKey('SaveProfile')}
          accessibilityRole="button"
        >
          <ThemedText style={styles.buttonText}>{t('MyProfile.Save')}</ThemedText>
        </TouchableOpacity>

        {hasPicture && (
          <TouchableOpacity
            style={[styles.button, styles.dangerButton]}
            onPress={handleClearPicture}
            disabled={loading || saving}
            testID={testIdWithKey('ClearPicture')}
            accessibilityRole="button"
          >
            <ThemedText style={styles.buttonText}>{t('MyProfile.ClearPicture')}</ThemedText>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

export default MyProfile
