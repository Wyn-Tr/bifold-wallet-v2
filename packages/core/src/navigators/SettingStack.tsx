import { createStackNavigator } from '@react-navigation/stack'
import React from 'react'
import { useTranslation } from 'react-i18next'

import { useTheme } from '../contexts/theme'
import { createCarouselStyle } from '../screens/OnboardingPages'
import { Screens, SettingStackParams } from '../types/navigators'
import { testIdWithKey } from '../utils/testable'

import { useDefaultStackOptions } from './defaultStackOptions'
import { TOKENS, useServices } from '../container-api'
import { View } from 'react-native'

const SettingStack: React.FC = () => {
  const Stack = createStackNavigator<SettingStackParams>()
  const theme = useTheme()
  const { t } = useTranslation()
  const [
    pages,
    { screen: terms },
    ToggleBiometry,
    developer,
    ScreenOptionsDictionary,
    Onboarding,
    // New injectable screens
    Settings,
    RenameWallet,
    Language,
    ConfigureMediator,
    AutoLock,
    DataRetention,
    Tours,
    PINChange,
    PINChangeSuccessScreen,
    TogglePushNotifications,
    HistorySettings,
    MyProfileScreen,
    // Wallet Backup/Restore Screens
    ExportWalletIntro,
    ExportWallet,
    ImportWallet,
    ImportWalletScan,
    ImportWalletResult,
  ] = useServices([
    TOKENS.SCREEN_ONBOARDING_PAGES,
    TOKENS.SCREEN_TERMS,
    TOKENS.SCREEN_TOGGLE_BIOMETRY,
    TOKENS.SCREEN_DEVELOPER,
    TOKENS.OBJECT_SCREEN_CONFIG,
    TOKENS.SCREEN_ONBOARDING,
    // New injectable screens
    TOKENS.SCREEN_SETTINGS,
    TOKENS.SCREEN_RENAME_WALLET,
    TOKENS.SCREEN_LANGUAGE,
    TOKENS.SCREEN_CONFIGURE_MEDIATOR,
    TOKENS.SCREEN_AUTO_LOCK,
    TOKENS.SCREEN_DATA_RETENTION,
    TOKENS.SCREEN_TOURS,
    TOKENS.SCREEN_PIN_CHANGE,
    TOKENS.SCREEN_PIN_CHANGE_SUCCESS,
    TOKENS.SCREEN_TOGGLE_PUSH_NOTIFICATIONS,
    TOKENS.SCREEN_HISTORY_SETTINGS,
    TOKENS.SCREEN_MY_PROFILE,
    // Wallet Backup/Restore Screens
    TOKENS.SCREEN_EXPORT_WALLET_INTRO,
    TOKENS.SCREEN_EXPORT_WALLET,
    TOKENS.SCREEN_IMPORT_WALLET,
    TOKENS.SCREEN_IMPORT_WALLET_SCAN,
    TOKENS.SCREEN_IMPORT_WALLET_RESULT,
  ])
  const defaultStackOptions = useDefaultStackOptions(theme)
  const OnboardingTheme = theme.OnboardingTheme
  const carousel = createCarouselStyle(OnboardingTheme)

  return (
    <Stack.Navigator screenOptions={{ ...defaultStackOptions }}>
      <Stack.Screen
        name={Screens.Settings}
        component={Settings}
        options={{
          title: t('Screens.Settings'),
          headerBackTestID: testIdWithKey('Back'),
          ...ScreenOptionsDictionary[Screens.Settings],
        }}
      />
      <Stack.Screen
        name={Screens.RenameWallet}
        component={RenameWallet}
        options={{
          title: t('Screens.NameWallet'),
          headerBackTestID: testIdWithKey('Back'),
          ...ScreenOptionsDictionary[Screens.RenameWallet],
        }}
      />
      <Stack.Screen
        name={Screens.Language}
        component={Language}
        options={{
          title: t('Screens.Language'),
          headerBackTestID: testIdWithKey('Back'),
          headerTransparent: true,
          headerBackground: () => <View style={{ flex: 1, backgroundColor: 'transparent'}} />,
          ...ScreenOptionsDictionary[Screens.Language],
        }}
      />
      <Stack.Screen
        name={Screens.ConfigureMediator}
        component={ConfigureMediator}
        options={{
          title: 'Configure Mediator',
          headerBackTestID: testIdWithKey('Back'),
          ...ScreenOptionsDictionary[Screens.ConfigureMediator],
        }}
      />
      <Stack.Screen
        name={Screens.AutoLock}
        component={AutoLock}
        options={{
          title: 'Auto lock Options',
          headerBackTestID: testIdWithKey('Back'),
          ...ScreenOptionsDictionary[Screens.AutoLock],
        }}
      />
      <Stack.Screen
        name={Screens.DataRetention}
        component={DataRetention}
        options={{
          title: t('Screens.DataRetention'),
          headerBackTestID: testIdWithKey('Back'),
          ...ScreenOptionsDictionary[Screens.DataRetention],
        }}
      />
      <Stack.Screen
        name={Screens.Tours}
        component={Tours}
        options={{
          title: t('Screens.Tours'),
          headerBackTestID: testIdWithKey('Back'),
          ...ScreenOptionsDictionary[Screens.Tours],
        }}
      />
      <Stack.Screen
        name={Screens.ToggleBiometry}
        component={ToggleBiometry}
        options={{
          title: t('Screens.Biometry'),
          headerBackTestID: testIdWithKey('Back'),
          ...ScreenOptionsDictionary[Screens.ToggleBiometry],
        }}
      />
      <Stack.Screen
        name={Screens.ChangePIN}
        component={PINChange}
        options={{
          title: t('Screens.ChangePIN'),
          headerBackTestID: testIdWithKey('Back'),
          headerTransparent: true,
          headerBackground: () => <View style={{ flex: 1, backgroundColor: 'transparent',}} />,
          ...ScreenOptionsDictionary[Screens.ChangePIN],
        }}
      />
      <Stack.Screen
        name={Screens.ChangePINSuccess}
        component={PINChangeSuccessScreen}
        options={{
          title: t('Screens.ConfirmPIN'),
          headerBackTestID: testIdWithKey('Back'),
          headerLeft: () => null,
          ...ScreenOptionsDictionary[Screens.ChangePINSuccess],
        }}
      />
      <Stack.Screen
        name={Screens.TogglePushNotifications}
        component={TogglePushNotifications}
        options={{
          title: t('Screens.PushNotifications'),
          headerBackTestID: testIdWithKey('Back'),
          ...ScreenOptionsDictionary[Screens.TogglePushNotifications],
        }}
      />
      <Stack.Screen
        name={Screens.Terms}
        component={terms}
        options={{
          title: t('Screens.Terms'),
          headerBackTestID: testIdWithKey('Back'),
          ...ScreenOptionsDictionary[Screens.Terms],
        }}
      />
      <Stack.Screen
        name={Screens.Developer}
        component={developer}
        options={{
          title: t('Screens.Developer'),
          headerBackTestID: testIdWithKey('Back'),
          ...ScreenOptionsDictionary[Screens.Developer],
        }}
      />
      <Stack.Screen name={Screens.Onboarding} options={{ title: t('Screens.Onboarding') }}>
        {(props) => (
          <Onboarding
            {...props}
            nextButtonText={t('Global.Next')}
            previousButtonText={t('Global.Back')}
            pages={pages(() => null, OnboardingTheme)}
            style={carousel}
            disableSkip={true}
          />
        )}
      </Stack.Screen>
      <Stack.Screen
        name={Screens.HistorySettings}
        component={HistorySettings}
        options={{
          title: t('Screens.HistorySettings'),
          headerBackTestID: testIdWithKey('Back'),
          ...ScreenOptionsDictionary[Screens.HistorySettings],
        }}
      />
      <Stack.Screen
        name={Screens.MyProfile}
        component={MyProfileScreen}
        options={{
          title: t('MyProfile.Title'),
          headerBackTestID: testIdWithKey('Back'),
          ...ScreenOptionsDictionary[Screens.MyProfile],
        }}
      />
      <Stack.Screen
        name={Screens.ExportWalletIntro}
        component={ExportWalletIntro}
        options={{
          title: t('ExportWallet.TransferWallet'),
          headerBackTestID: testIdWithKey('Back'),
          headerShown: false,
        }}
      />
      <Stack.Screen
        name={Screens.ExportWallet}
        component={ExportWallet}
        options={{
          title: t('ExportWallet.TransferWallet'),
          headerBackTestID: testIdWithKey('Back'),
        }}
      />
      <Stack.Screen
        name={Screens.ImportWallet}
        component={ImportWallet}
        options={{
          title: t('ImportWallet.RestoreWallet'),
          headerBackTestID: testIdWithKey('Back'),
          headerShown: false,
        }}
      />
      <Stack.Screen
        name={Screens.ImportWalletScan}
        component={ImportWalletScan}
        options={{
          title: t('ImportWallet.ScanQRCode'),
          headerBackTestID: testIdWithKey('Back'),
        }}
      />
      <Stack.Screen
        name={Screens.ImportWalletResult}
        component={ImportWalletResult}
        options={{
          title: '',
          headerBackTestID: testIdWithKey('Back'),
          headerLeft: () => null,
        }}
      />
    </Stack.Navigator>
  )
}

export default SettingStack
