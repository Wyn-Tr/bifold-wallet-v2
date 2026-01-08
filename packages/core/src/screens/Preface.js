import { useNavigation } from '@react-navigation/native';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View, TouchableOpacity, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CheckBoxRow from '../components/inputs/CheckBoxRow';
import { DispatchAction } from '../contexts/reducers/store';
import { useStore } from '../contexts/store';
import { useTheme } from '../contexts/theme';
import { Screens } from '../types/navigators';
import { testIdWithKey } from '../utils/testable';
import { ThemedBackground } from '../modules/theme/components/ThemedBackground';
import { useOnboardingTheme } from '../modules/theme/hooks/useOnboardingTheme';
const Preface = () => {
    const [, dispatch] = useStore();
    const [checked, setChecked] = useState(false);
    const { t } = useTranslation();
    const navigation = useNavigation();
    const { Assets, TextTheme } = useTheme();
    const onboardingTheme = useOnboardingTheme();
    const onSubmitPressed = () => {
        dispatch({
            type: DispatchAction.DID_SEE_PREFACE,
        });
        navigation.navigate(Screens.Onboarding);
    };
    const style = StyleSheet.create({
        screenContainer: {
            flex: 1,
            padding: 20,
            justifyContent: 'space-between',
        },
        contentContainer: {},
        controlsContainer: {},
        cardContainer: {
            backgroundColor: onboardingTheme.card.container.backgroundColor,
            borderRadius: onboardingTheme.card.container.borderRadius,
            padding: onboardingTheme.card.container.padding,
            paddingTop: onboardingTheme.card.container.paddingTop,
            paddingBottom: onboardingTheme.card.container.paddingBottom,
            paddingHorizontal: onboardingTheme.card.container.paddingHorizontal,
            marginHorizontal: onboardingTheme.card.container.marginHorizontal,
            marginBottom: onboardingTheme.card.container.marginBottom,
            marginTop: 'auto',
        },
        cardTitle: {
            color: onboardingTheme.card.title.color,
            fontSize: onboardingTheme.card.title.fontSize,
            fontWeight: onboardingTheme.card.title.fontWeight,
            marginBottom: onboardingTheme.card.title.marginBottom,
        },
        cardBody: {
            color: onboardingTheme.card.bodyText.color,
            fontSize: onboardingTheme.card.bodyText.fontSize,
            fontWeight: onboardingTheme.card.bodyText.fontWeight,
            lineHeight: onboardingTheme.card.bodyText.lineHeight,
        },
        checkboxContainer: {
            marginTop: onboardingTheme.checkbox.container.marginTop,
        },
        primaryButton: {
            backgroundColor: onboardingTheme.buttons.primary.container.backgroundColor,
            borderRadius: onboardingTheme.buttons.primary.container.borderRadius,
            paddingVertical: onboardingTheme.buttons.primary.container.paddingVertical,
            paddingHorizontal: onboardingTheme.buttons.primary.container.paddingHorizontal,
            minHeight: onboardingTheme.buttons.primary.container.minHeight,
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 24,
        },
        primaryButtonText: {
            color: onboardingTheme.buttons.primary.text.color,
            fontSize: onboardingTheme.buttons.primary.text.fontSize,
            fontWeight: onboardingTheme.buttons.primary.text.fontWeight,
            textTransform: onboardingTheme.buttons.primary.text.textTransform,
        },
        primaryButtonDisabled: {
            opacity: onboardingTheme.buttons.primary.disabled.opacity,
        },
    });
    return (<ThemedBackground screenId="onboarding" style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['left', 'right', 'bottom']}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
          <View style={style.screenContainer}>
            <View style={style.contentContainer}>
              <Assets.svg.preface style={{ alignSelf: 'center', marginBottom: 20 }} height={200}/>
            </View>
            <View style={style.cardContainer}>
              <Text style={style.cardTitle}>{t('Preface.PrimaryHeading')}</Text>
              <Text style={style.cardBody}>{t('Preface.Paragraph1')}</Text>
              <View style={style.checkboxContainer}>
                <CheckBoxRow title={t('Preface.Confirmed')} accessibilityLabel={t('Terms.IAgree')} testID={testIdWithKey('IAgree')} checked={checked} onPress={() => setChecked(!checked)} reverse titleStyle={{
            ...onboardingTheme.checkbox.label,
            fontWeight: TextTheme.bold.fontWeight,
        }}/>
              </View>
              <TouchableOpacity style={[style.primaryButton, !checked && style.primaryButtonDisabled]} onPress={onSubmitPressed} disabled={!checked} accessibilityLabel={t('Global.Continue')} testID={testIdWithKey('Continue')}>
                <Text style={style.primaryButtonText}>{t('Global.Continue')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedBackground>);
};
export default Preface;
