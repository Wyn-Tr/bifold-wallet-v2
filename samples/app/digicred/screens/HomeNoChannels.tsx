/* eslint-disable no-console */
import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Dimensions,
} from 'react-native'
import { GradientBackground, DigiCredButton } from '../components'
import { useTranslation } from 'react-i18next'
import FactCheck from '../assets/FactCheck.svg'
import LockPurple from '../assets/LockPurple.svg'
import DigiCredPurple from '../assets/DigiCredPurple.svg'
import { DigiCredColors } from '../theme'
import { useNavigation } from '@react-navigation/native'
import { useCredentials, useConnections } from '@credo-ts/react-hooks'
import { CredentialState, ConnectionType, DidExchangeState } from '@credo-ts/core'
import { useStore } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import { SafeAreaView } from 'react-native-safe-area-context'
import HomeNoChannelModal from '../components/HomeNoChannelModal'
import { isSmallScreen, isTablet } from '../utils/devices'
import { TOKENS, useServices } from '../../../../packages/core/src/container-api'
import { Screens, Stacks } from '../../../../packages/core/src/types/navigators'
import LinearGradient from 'react-native-linear-gradient'
import { PERMISSIONS, RESULTS, request, Permission, check, openSettings } from 'react-native-permissions'
import { Platform, Alert } from 'react-native'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

const HomeNoChannels = () => {
  const { t } = useTranslation()
  const navigation = useNavigation<StackNavigationProp<Record<string, object | undefined>>>()

  const [store] = useStore()
  const [config] = useServices([TOKENS.CONFIG])
  const contactHideList = config?.contactHideList
  const hasChecked = useRef(false)

  const { records: credentials = [], loading: credLoading } = useCredentials()
  const { records: connections = [], loading: connLoading } = useConnections()
  const loading = credLoading || connLoading

  const [shouldRenderHomeNoChannels, setShouldRenderHomeNoChannels] = useState<boolean | null>(null)

  useEffect(() => {
    if (!loading && !hasChecked.current) {
      hasChecked.current = true

      const hasCredential = credentials.some(
        (c) => c.state === CredentialState.CredentialReceived || c.state === CredentialState.Done
      )

      const hasConnection = connections.some((conn) => {
        if (conn.connectionTypes.includes(ConnectionType.Mediator)) return false
        const name = conn.theirLabel || conn.alias
        if (contactHideList?.includes(name ?? '')) return false
        return !(!store.preferences.developerModeEnabled && conn.state !== DidExchangeState.Completed)
      })

      if (hasCredential || hasConnection) {
        navigation.replace(Stacks.TabStack)
      } else {
        setShouldRenderHomeNoChannels(true)
      }
    }
  }, [loading, credentials, connections, contactHideList, store.preferences.developerModeEnabled, navigation])

  const fadeAnim = useRef(new Animated.Value(0)).current
  const translateYAnim = useRef(new Animated.Value(30)).current
  const item1Anim = useRef(new Animated.Value(0)).current
  const item2Anim = useRef(new Animated.Value(0)).current
  const item3Anim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (shouldRenderHomeNoChannels) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(translateYAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]).start(() => {
        Animated.stagger(200, [
          Animated.timing(item1Anim, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(item2Anim, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(item3Anim, { toValue: 1, duration: 400, useNativeDriver: true }),
        ]).start()
      })
    }
  }, [fadeAnim, item1Anim, item2Anim, item3Anim, shouldRenderHomeNoChannels, translateYAnim])

  const handleScanPress = useCallback(async () => {
    try {
      // Determine which permission to check based on platform
      let permission: Permission
      if (Platform.OS === 'ios') {
        permission = PERMISSIONS.IOS.CAMERA
      } else if (Platform.OS === 'android') {
        permission = PERMISSIONS.ANDROID.CAMERA
      } else {
        // If platform not supported, just navigate (shouldn't happen)
        navigation.navigate(Stacks.ConnectStack as string, { screen: Screens.Scan } as Record<string, unknown>)
        return
      }

      // First check current permission status
      const checkResult = await check(permission)

      // If already granted, navigate directly
      if (checkResult === RESULTS.GRANTED) {
        navigation.navigate(Stacks.ConnectStack as string, { screen: Screens.Scan } as Record<string, unknown>)
        return
      }

      // If BLOCKED (permanently denied), show alert to go to settings
      if (checkResult === RESULTS.BLOCKED) {
        Alert.alert(
          'Camera Permission Required',
          'Camera access is needed to scan QR codes. Please enable it in your device settings.',
          [
            {
              text: 'Cancel',
              style: 'cancel',
            },
            {
              text: 'Open Settings',
              onPress: () => openSettings(),
            },
          ]
        )
        return
      }

      // For DENIED, UNAVAILABLE, or first time - request permission
      const result = await request(permission)

      // Only navigate if permission granted
      if (result === RESULTS.GRANTED) {
        navigation.navigate(Stacks.ConnectStack as string, { screen: Screens.Scan } as Record<string, unknown>)
      }

      // If denied, just stay on current screen silently
      // Next time they click, check() will return BLOCKED and show the alert
    } catch (error) {
      console.error('Error requesting camera permission:', error)
    }
  }, [navigation])

  const contents = [
    {
      title: 'Digital Credentials',
      description:
        'Digital credentials are the electronic equivalent of physical credentials and documents such as identity cards, certificates, or transcripts offered by participating services.\n\nServices are simplified and expedited as organizations can confirm who you are and what you have accomplished with trusted information from the digital credentials.',
    },
    {
      title: 'Private and Confidential',
      description:
        'Your privacy is important.\n\nDigiCred nor any other party has access to your credentials unless they issued them directly to you or you have explicitly consented to share them. There is no tracking, analytics or correlation.\n\nYou approve every use of your digital credentials.',
    },
    {
      title: 'Your Credential Wallet',
      description:
        'This is your wallet where you will hold your digital credentials. It will help you receive and present your documents when you are in-person or online. You will receive your documents from participating organizations and be able to safely and securely share them with others.\n\nInteract with confidence with individuals and organizations you trust.',
    },
  ]

  const [modalVisible, setModalVisible] = useState(false)
  const [modalContent, setModalContent] = useState<{ title: string; description: string } | null>(null)

  const handleItemPress = (index: number) => {
    setModalContent(contents[index])
    setModalVisible(true)
  }

  const circleSize = isTablet() ? Math.min(SCREEN_WIDTH * 1.3, 950) : 623
  const circleTop = isTablet() ? -circleSize * 0.3 : 0

  const howItWorksMarginTop = isTablet() ? 200 : isSmallScreen() ? 0 : 60
  const itemWidth = isTablet() ? '50%' : '90%'

  if (loading || shouldRenderHomeNoChannels === null) {
    return (
      <GradientBackground>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      </GradientBackground>
    )
  }

  if (!shouldRenderHomeNoChannels) {
    return null
  }

  return (
    <GradientBackground>
      <StatusBar barStyle="light-content" backgroundColor={DigiCredColors.homeNoChannels.darkCircle} animated={true} />
      <SafeAreaView style={styles.container}>
        <View
          style={[
            styles.darkCircle,
            {
              width: circleSize,
              height: circleSize,
              marginLeft: -circleSize / 2,
              top: isTablet() ? circleTop : -circleSize * 0.3,
            },
          ]}
        />
        <View style={[styles.contentWrapper, { marginTop: isTablet() ? 120 : 0, marginBottom: isTablet() ? 30 : 10 }]}>
          <Animated.View
            style={[
              styles.content,
              {
                opacity: fadeAnim,
                transform: [{ translateY: translateYAnim }],
              },
            ]}
          >
            <Text style={styles.title}>{t('homeNoChannels.welcome')}</Text>
            <Text style={styles.title}>DigiCred Wallet</Text>
            <Text style={[styles.description, isSmallScreen() ? { marginVertical: 20 } : {}]}>
              {t('homeNoChannels.description')}
            </Text>
            <LinearGradient
              colors={DigiCredColors.homeNoChannels.buttonGradient}
              locations={DigiCredColors.homeNoChannels.buttonGradientLocations}
              start={{ x: 0, y: 1 }}
              end={{ x: 1, y: 0 }}
              style={[styles.backgroundBtn, isTablet() ? { width: '60%', height: 60 } : { width: '75%' }]}
            >
              <DigiCredButton
                title={t('homeNoChannels.joinButton')}
                onPress={handleScanPress}
                variant="primary"
                customStyle={styles.button}
                customTextStyle={styles.buttonText}
                iconName="qrcode-scan"
                iconSize={20}
                iconColor={DigiCredColors.text.primary}
              />
            </LinearGradient>
            <Text
              style={[
                styles.howItWorks,
                {
                  marginTop: howItWorksMarginTop,
                  textAlign: isTablet() ? 'center' : 'left',
                  marginLeft: isTablet() ? '-25%' : 0,
                },
              ]}
            >
              {t('homeNoChannels.howItWorks')}
            </Text>

            <Animated.View
              style={[
                styles.animatedItem,
                {
                  opacity: item1Anim,
                  transform: [{ translateY: item1Anim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }],
                },
              ]}
            >
              <TouchableOpacity
                style={[styles.item, { width: itemWidth }]}
                onPress={() => handleItemPress(0)}
                activeOpacity={0.7}
              >
                <View style={styles.iconWrapper}>
                  <FactCheck width={55} height={55} fill={DigiCredColors.homeNoChannels.itemIconColor} />
                </View>
                <View style={styles.textContainer}>
                  <Text style={styles.itemTitle}>{t('homeNoChannels.item1.title')}</Text>
                  <Text style={styles.itemDescription}>{t('homeNoChannels.item1.description')}</Text>
                </View>
              </TouchableOpacity>
            </Animated.View>

            <Animated.View
              style={[
                styles.animatedItem,
                {
                  opacity: item2Anim,
                  transform: [{ translateY: item2Anim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }],
                },
              ]}
            >
              <TouchableOpacity
                style={[styles.item, { width: itemWidth }]}
                onPress={() => handleItemPress(1)}
                activeOpacity={0.7}
              >
                <View style={styles.iconWrapper}>
                  <LockPurple width={55} height={55} fill={DigiCredColors.homeNoChannels.itemIconColor} />
                </View>
                <View style={styles.textContainer}>
                  <Text style={styles.itemTitle}>{t('homeNoChannels.item2.title')}</Text>
                  <Text style={styles.itemDescription}>{t('homeNoChannels.item2.description')}</Text>
                </View>
              </TouchableOpacity>
            </Animated.View>

            <Animated.View
              style={[
                styles.animatedItem,
                {
                  opacity: item3Anim,
                  transform: [{ translateY: item3Anim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }],
                },
              ]}
            >
              <TouchableOpacity
                style={[styles.item, { width: itemWidth }]}
                onPress={() => handleItemPress(2)}
                activeOpacity={0.7}
              >
                <View style={styles.iconWrapper}>
                  <DigiCredPurple width={60} height={60} fill={DigiCredColors.homeNoChannels.itemIconColor} />
                </View>
                <View style={styles.textContainer}>
                  <Text style={styles.itemTitle}>{t('homeNoChannels.item3.title')}</Text>
                  <Text style={styles.itemDescription}>{t('homeNoChannels.item3.description')}</Text>
                </View>
              </TouchableOpacity>
            </Animated.View>
          </Animated.View>
        </View>
      </SafeAreaView>
      {modalVisible && modalContent && (
        <HomeNoChannelModal visible={modalVisible} onClose={() => setModalVisible(false)} content={modalContent} />
      )}
    </GradientBackground>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: '100%',
    position: 'relative',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  darkCircle: {
    position: 'absolute',
    borderRadius: 1000,
    backgroundColor: DigiCredColors.homeNoChannels.darkCircle,
    left: '50%',
    zIndex: -1,
  },
  contentWrapper: {
    flexGrow: 1,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 40,
    backgroundColor: 'transparent',
  },
  content: {
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: DigiCredColors.text.homePrimary,
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    fontWeight: '400',
    color: DigiCredColors.text.homePrimary,
    marginVertical: 40,
    lineHeight: 24,
    textAlign: 'center',
  },
  button: {
    backgroundColor: 'transparent',
    borderRadius: 25,
  },
  backgroundBtn: {
    height: 55,
    borderRadius: 25,
    justifyContent: 'center',
    marginBottom: 50,
    alignSelf: 'center',
  },
  buttonText: {
    color: DigiCredColors.text.homePrimary,
    fontFamily: 'Open Sans',
    fontSize: 16,
    fontStyle: 'normal',
    fontWeight: '700',
    lineHeight: 24,
    letterSpacing: 0.64,
    textTransform: 'uppercase',
  },
  howItWorks: {
    fontSize: 18,
    fontWeight: '600',
    color: DigiCredColors.text.homePrimary,
    width: '100%',
    alignSelf: 'center',
  },
  animatedItem: {
    marginTop: 15,
    alignSelf: 'center',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: DigiCredColors.homeNoChannels.itemBorder,
    backgroundColor: DigiCredColors.homeNoChannels.itemBackground,
  },
  iconWrapper: {
    width: 55,
    height: 55,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    backgroundColor: DigiCredColors.homeNoChannels.itemIconBackground,
  },
  textContainer: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: DigiCredColors.text.homePrimary,
    marginBottom: 4,
  },
  itemDescription: {
    fontSize: 14,
    fontWeight: '400',
    color: DigiCredColors.homeNoChannels.itemDescription,
    lineHeight: 20,
  },
})

export default HomeNoChannels
