import { useAgent } from '@credo-ts/react-hooks'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Text, useWindowDimensions, View, StyleSheet, DeviceEventEmitter } from 'react-native'
import { isTablet } from 'react-native-device-info'
import { OrientationType, useOrientationChange } from 'react-native-orientation-locker'
import { SafeAreaView } from 'react-native-safe-area-context'

import { AttachTourStep } from '../components/tour/AttachTourStep'
import { EventTypes } from '../constants'
import { TOKENS, useServices } from '../container-api'
import { useNetwork } from '../contexts/network'
import { DispatchAction } from '../contexts/reducers/store'
import { useStore } from '../contexts/store'
import { useTheme } from '../contexts/theme'
import { BifoldError } from '../types/error'
import { Screens, Stacks, TabStackParams, TabStacks } from '../types/navigators'
import { connectFromScanOrDeepLink } from '../utils/helpers'
import { testIdWithKey } from '../utils/testable'
import { useIncomingCallHandler } from '../hooks/useIncomingCallHandler'

import { BaseTourID } from '../types/tour'
import { useTabBarTheme } from '../modules/theme/hooks/useTabBarTheme'

const TabStack: React.FC = () => {
  const { fontScale } = useWindowDimensions()
  const modularTabTheme = useTabBarTheme()

  // Handle incoming WebRTC calls globally
  useIncomingCallHandler({ enabled: true })
  const badgeFontSize = useMemo(() => {
    if (fontScale >= 1.2 && fontScale < 1.5) {
      return {
        fontSize: 15,
        lineHeight: 15,
      }
    } else if (fontScale >= 1.5 && fontScale < 1.7) {
      return {
        fontSize: 10,
        lineHeight: 10,
      }
    } else if (fontScale >= 1.7 && fontScale < 3) {
      return {
        fontSize: 8,
        lineHeight: 8,
      }
    } else if (fontScale >= 3 && fontScale < 4) {
      return {
        fontSize: 6,
        lineHeight: 6,
      }
    }
    return null
  }, [fontScale])
  const [
    { useNotifications },
    { enableImplicitInvitations, enableReuseConnections },
    logger,
    // Injectable stacks
    HomeStack,
    CredentialStack,
  ] = useServices([
    TOKENS.NOTIFICATIONS,
    TOKENS.CONFIG,
    TOKENS.UTIL_LOGGER,
    // Injectable stacks
    TOKENS.STACK_HOME,
    TOKENS.STACK_CREDENTIAL,
  ])
  const notifications = useNotifications({})
  const { t } = useTranslation()
  const Tab = createBottomTabNavigator<TabStackParams>()
  const { assertNetworkConnected } = useNetwork()
  const { ColorPalette, TabTheme, TextTheme, Assets, NavigationTheme } = useTheme()
  const [orientation, setOrientation] = useState(OrientationType.PORTRAIT)
  const [store, dispatch] = useStore()
  const { agent } = useAgent()
  const navigation = useNavigation<StackNavigationProp<TabStackParams>>()
  const showLabels = fontScale * TabTheme.tabBarTextStyle.fontSize < 18

  // Check if floating tab bar variant is enabled from modular theme
  const isFloatingTabBar = modularTabTheme.variant === 'floating'

  const styles = StyleSheet.create({
    tabBarIcon: {
      flex: 1,
    },
  })

  useOrientationChange((orientationType) => {
    setOrientation(orientationType)
  })

  const leftMarginForDevice = () => {
    if (isTablet()) {
      return orientation in [OrientationType.PORTRAIT, OrientationType['PORTRAIT-UPSIDEDOWN']] ? 130 : 170
    }

    return 0
  }

  const handleDeepLink = useCallback(
    async (deepLink: string) => {
      logger.info(`Handling deeplink: ${deepLink}`)

      // If it's just the general link with no params, set link inactive and do nothing
      if (deepLink.search(/oob=|c_i=|d_m=|url=/) < 0) {
        dispatch({
          type: DispatchAction.ACTIVE_DEEP_LINK,
          payload: [undefined],
        })
        return
      }

      try {
        await connectFromScanOrDeepLink(
          deepLink,
          agent,
          logger,
          navigation,
          true, // isDeepLink
          enableImplicitInvitations,
          enableReuseConnections
        )
      } catch (err: unknown) {
        const error = new BifoldError(
          t('Error.Title1039'),
          t('Error.Message1039'),
          (err as Error)?.message ?? err,
          1039
        )
        DeviceEventEmitter.emit(EventTypes.ERROR_ADDED, error)
      } finally {
        dispatch({
          type: DispatchAction.ACTIVE_DEEP_LINK,
          payload: [undefined],
        })
      }
    },
    [agent, enableImplicitInvitations, enableReuseConnections, logger, navigation, t, dispatch]
  )

  useEffect(() => {
    if (store.deepLink && agent && store.authentication.didAuthenticate) {
      handleDeepLink(store.deepLink)
    }
  }, [store.deepLink, agent, store.authentication.didAuthenticate, handleDeepLink])

  // Build tab bar style from modular theme with floating support
  const tabBarStyleFromModular = useMemo(() => {
    if (isFloatingTabBar) {
      return {
        ...modularTabTheme.style,
        position: 'absolute' as const,
        bottom: modularTabTheme.style.bottom ?? 16,
        left: modularTabTheme.style.left ?? 16,
        right: modularTabTheme.style.right ?? 16,
        borderRadius: modularTabTheme.style.borderRadius ?? 32,
        borderTopWidth: 0,
        paddingBottom: 0,
      }
    }
    return {
      ...TabTheme.tabBarStyle,
      ...modularTabTheme.style,
    }
  }, [isFloatingTabBar, modularTabTheme.style, TabTheme.tabBarStyle])

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: NavigationTheme.colors.primary }} edges={['left', 'right', 'top']}>
      <Tab.Navigator
        initialRouteName={TabStacks.HomeStack}
        screenOptions={{
          unmountOnBlur: true,
          tabBarStyle: tabBarStyleFromModular,
          tabBarActiveTintColor: modularTabTheme.colors.activeTintColor || TabTheme.tabBarActiveTintColor,
          tabBarInactiveTintColor: modularTabTheme.colors.inactiveTintColor || TabTheme.tabBarInactiveTintColor,
          header: () => null,
        }}
      >
        <Tab.Screen
          name={TabStacks.HomeStack}
          component={HomeStack}
          options={{
            tabBarIconStyle: styles.tabBarIcon,
            tabBarIcon: ({ color, focused }) => (
              <AttachTourStep tourID={BaseTourID.HomeTour} index={1}>
                <View style={{ ...TabTheme.tabBarContainerStyle, justifyContent: showLabels ? 'flex-end' : 'center' }}>
                  {focused ? (
                    <Assets.svg.tabOneFocusedIcon height={30} width={30} fill={color} />
                  ) : (
                    <Assets.svg.tabOneIcon height={30} width={30} fill={color} />
                  )}
                  {showLabels && (
                    <Text
                      style={{
                        ...TabTheme.tabBarTextStyle,
                        color: focused ? TabTheme.tabBarActiveTintColor : TabTheme.tabBarInactiveTintColor,
                        fontWeight: focused ? TextTheme.bold.fontWeight : TextTheme.normal.fontWeight,
                      }}
                    >
                      {t('TabStack.Home')}
                    </Text>
                  )}
                </View>
              </AttachTourStep>
            ),
            tabBarShowLabel: false,
            tabBarAccessibilityLabel: `${t('TabStack.Home')} (${notifications.length ?? 0})`,
            tabBarTestID: testIdWithKey(t('TabStack.Home')),
            tabBarBadge: notifications.length || undefined,
            tabBarBadgeStyle: {
              marginLeft: leftMarginForDevice(),
              backgroundColor: ColorPalette.semantic.error,
              ...badgeFontSize,
            },
          }}
        />
        <Tab.Screen
          name={TabStacks.ConnectStack}
          options={{
            tabBarIconStyle: styles.tabBarIcon,
            tabBarIcon: ({ focused }) => (
              <AttachTourStep tourID={BaseTourID.HomeTour} index={0}>
                <View
                  style={{
                    ...TabTheme.tabBarContainerStyle,
                    justifyContent: 'center',
                  }}
                  accessible={true}
                  accessibilityRole={'button'}
                  accessibilityLabel={t('TabStack.Scan')}
                >
                  <Text
                    style={{
                      ...TabTheme.tabBarTextStyle,
                      color: focused ? TabTheme.tabBarActiveTintColor : TabTheme.tabBarInactiveTintColor,
                      fontWeight: focused ? TextTheme.bold.fontWeight : TextTheme.normal.fontWeight,
                    }}
                  >
                    {t('TabStack.Scan')}
                  </Text>
                </View>
              </AttachTourStep>
            ),
            tabBarShowLabel: false,
            tabBarAccessibilityLabel: t('TabStack.Scan'),
            tabBarTestID: testIdWithKey(t('TabStack.Scan')),
          }}
          listeners={({ navigation }) => ({
            tabPress: (e) => {
              e.preventDefault()
              if (!assertNetworkConnected()) {
                return
              }
              navigation.navigate(Stacks.ConnectStack, { screen: Screens.Scan })
            },
          })}
        >
          {() => <View />}
        </Tab.Screen>
        <Tab.Screen
          name={TabStacks.CredentialStack}
          component={CredentialStack}
          options={{
            tabBarIconStyle: styles.tabBarIcon,
            tabBarIcon: ({ color, focused }) => (
              <AttachTourStep tourID={BaseTourID.HomeTour} index={2}>
                <View style={{ ...TabTheme.tabBarContainerStyle, justifyContent: showLabels ? 'flex-end' : 'center' }}>
                  {focused ? (
                    <Assets.svg.tabThreeFocusedIcon height={30} width={30} fill={color} />
                  ) : (
                    <Assets.svg.tabThreeIcon height={30} width={30} fill={color} />
                  )}
                  {showLabels && (
                    <Text
                      style={{
                        ...TabTheme.tabBarTextStyle,
                        color: focused ? TabTheme.tabBarActiveTintColor : TabTheme.tabBarInactiveTintColor,
                        fontWeight: focused ? TextTheme.bold.fontWeight : TextTheme.normal.fontWeight,
                      }}
                    >
                      {t('TabStack.ListCredentials')}
                    </Text>
                  )}
                </View>
              </AttachTourStep>
            ),
            tabBarShowLabel: false,
            tabBarAccessibilityLabel: t('TabStack.ListCredentials'),
            tabBarTestID: testIdWithKey(t('TabStack.ListCredentials')),
          }}
        />
      </Tab.Navigator>
      <SafeAreaView style={{ backgroundColor: TabTheme.tabBarSecondaryBackgroundColor }} edges={['bottom']} />
    </SafeAreaView>
  )
}

export default TabStack
