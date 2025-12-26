import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { useCallback, useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollView, StyleSheet, View, TouchableOpacity, Text, Dimensions, Animated } from 'react-native'
import { DispatchAction } from '../contexts/reducers/store'
import { useStore } from '../contexts/store'
import { OnboardingStackParams, Screens } from '../types/navigators'
import { testIdWithKey } from '../utils/testable'
import ScreenLayout from '../layout/ScreenLayout'
import { ThemedText } from '../components/texts/ThemedText'
import React = require('react')

export const TermsVersion = '1'

const Terms: React.FC = () => {
  const [store, dispatch] = useStore()
  const agreedToPreviousTerms = store.onboarding.didAgreeToTerms
  const [checked, setChecked] = useState(agreedToPreviousTerms)
  const { t } = useTranslation()
  const navigation = useNavigation<StackNavigationProp<OnboardingStackParams>>()

  const scrollY = useRef(new Animated.Value(0)).current
  const scrollViewRef = useRef<ScrollView>(null)
  const [contentHeight, setContentHeight] = useState(0)
  const [scrollViewHeight, setScrollViewHeight] = useState(0)
  const [showScrollbar, setShowScrollbar] = useState(false)

  const onSubmitPressed = useCallback(() => {
    dispatch({
      type: DispatchAction.DID_AGREE_TO_TERMS,
      payload: [{ DidAgreeToTerms: TermsVersion }],
    })
  }, [dispatch])

  const handleContentSizeChange = (width: number, height: number) => {
    setContentHeight(height)
  }

  const handleScrollViewLayout = (event: never) => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    setScrollViewHeight(event.nativeEvent.layout.height)
  }

  useEffect(() => {
    if (contentHeight > 0 && scrollViewHeight > 0) {
      setShowScrollbar(contentHeight > scrollViewHeight)
    }
  }, [contentHeight, scrollViewHeight])

  const scrollIndicatorSize = showScrollbar ? Math.max(scrollViewHeight * (scrollViewHeight / contentHeight), 40) : 0

  const scrollIndicatorPosition = scrollY.interpolate({
    inputRange: [0, Math.max(1, contentHeight - scrollViewHeight)],
    outputRange: [0, Math.max(0, scrollViewHeight - scrollIndicatorSize)],
    extrapolate: 'clamp',
  })

  return (
    <ScreenLayout screen={Screens.Terms}>
      <View style={style.modalContainer}>
        <ThemedText style={style.title}>Terms And Conditions</ThemedText>
        <View
          style={{
            position: 'relative',
            height: '70%',
            width: '100%',
            backgroundColor: 'transparent',
          }}
        >
          <Animated.ScrollView
            ref={scrollViewRef}
            style={{ flex: 1, width: '100%' }}
            contentContainerStyle={style.scrollContentContainer}
            showsVerticalScrollIndicator={false}
            onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
            scrollEventThrottle={16}
            onContentSizeChange={handleContentSizeChange}
            onLayout={handleScrollViewLayout}
          >
            <ThemedText style={style.subtitle}>
              Please agree to the terms and conditions below before using this application.
            </ThemedText>
            <ThemedText style={style.bodyText}>
              {`These terms and conditions (Terms) govern your use of the DigiCred Mobile Wallet ("App"), developed by DigiCred Holdings Inc. ("Developer"). By downloading, installing, or using the App, you agree to be bound by these Terms. If you do not agree to these Terms, do not use this App.`}
            </ThemedText>
            <ThemedText style={style.bodyText}>
              <ThemedText style={{ fontWeight: '700', color: '#FFFFFF' }}>Definitions</ThemedText> {`"User" refers to any person who downloads, installs, or uses the App. "Content" refers to any text, images, or other media through the App.`}
            </ThemedText>
            <ThemedText style={style.bodyText}>
              <ThemedText style={{ fontWeight: '700', color: '#FFFFFF' }}>License</ThemedText> Subject to your
              compliance with these Terms, the Developer Grants you a limited non-exclusive, non-transferrable license
              to use the App for personal, non-commercial purposes. You may not copy, modify, distribute, sell, or lease
              any part of the App.
            </ThemedText>
          </Animated.ScrollView>

          {showScrollbar && (
            <View style={style.scrollbarContainer}>
              <Animated.View
                style={[
                  style.scrollbarThumb,
                  {
                    height: scrollIndicatorSize,
                    transform: [{ translateY: scrollIndicatorPosition }],
                    backgroundColor: '#005F5F',
                  },
                ]}
              />
            </View>
          )}
        </View>

        <View style={style.checkboxContainer}>
          <TouchableOpacity
            testID={testIdWithKey('IAgree')}
            onPress={() => setChecked(!checked)}
            style={[style.checkbox, checked && style.checkboxChecked]}
          >
            {checked && <Text style={style.checkmark}>✓</Text>}
          </TouchableOpacity>
          <ThemedText style={[style.checkboxLabel, checked ? { color: '#ffffff' } : {}]}>
            I have read, understand and accept the terms and conditions.
          </ThemedText>
        </View>

        <TouchableOpacity
          testID={agreedToPreviousTerms ? testIdWithKey('Accept') : testIdWithKey('Continue')}
          disabled={!checked}
          onPress={onSubmitPressed}
          style={[style.continueButton, !checked && { opacity: 0.6 }]}
        >
          <Text style={style.continueButtonText}>{t('Global.Continue')}</Text>
        </TouchableOpacity>
      </View>
    </ScreenLayout>
  )
}

const style = StyleSheet.create({
  modalContainer: {
    display: 'flex',
    height: '100%',
    padding: 24,
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 24,
    alignSelf: 'stretch',
    borderRadius: 16,
    backgroundColor: '#25272A',
    shadowColor: 'rgba(0, 0, 0, 0.48)',
    shadowOffset: { width: 2, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 5,
    maxHeight: Dimensions.get('window').height * 0.8,
  },
  title: {
    fontFamily: 'Open Sans',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 24,
    color: '#FFFFFF',
    width: '100%',
  },
  subtitle: {
    fontFamily: 'Open Sans',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 24,
    color: '#B5B3BC',
    width: '100%',
    marginBottom: 20,
  },
  bodyText: {
    fontFamily: 'Open Sans',
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
    color: '#B5B3BC',
    marginBottom: 30,
  },
  scrollContentContainer: {
    paddingRight: 24,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    width: '100%',
    marginTop: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#B5B3BC',
    borderRadius: 4,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: '#6C5CE7',
    borderColor: 'white',
    borderWidth: 1,
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontFamily: 'Open Sans',
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
    color: '#B5B3BC',
    flex: 1,
  },
  continueButton: {
    display: 'flex',
    paddingVertical: 12,
    paddingHorizontal: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 25,
    backgroundColor: '#004D4D',
    width: '50%',
    minWidth: 154,
    height: 48,
    marginLeft: 0,
  },
  continueButtonText: {
    fontFamily: 'Open Sans',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 24,
    color: '#FFFFFF',
  },
  scrollbarContainer: {
    position: 'absolute',
    right: 8,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  scrollbarThumb: {
    position: 'absolute',
    right: 0,
    width: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
})

export default Terms
