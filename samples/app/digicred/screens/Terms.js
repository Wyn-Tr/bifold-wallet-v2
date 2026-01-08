import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions, ScrollView, } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useStore, DispatchAction, testIdWithKey, ThemedText } from '@bifold/core';
import { GradientBackground, CardModal, DigiCredButton } from '../components';
import { DigiCredColors } from '../theme';
export const TermsVersion = '1.0';
const Terms = () => {
    const [store, dispatch] = useStore();
    useNavigation();
    const agreedToPreviousTerms = store.onboarding.didAgreeToTerms;
    const hasPreviouslyAgreed = Array.isArray(agreedToPreviousTerms) && agreedToPreviousTerms.length > 0;
    const [checked, setChecked] = useState(hasPreviouslyAgreed);
    const [scrolledToEnd, setScrolledToEnd] = useState(false);
    const scrollY = useRef(new Animated.Value(0)).current;
    const scrollViewRef = useRef(null);
    const [contentHeight, setContentHeight] = useState(0);
    const [scrollViewHeight, setScrollViewHeight] = useState(0);
    const [showScrollbar, setShowScrollbar] = useState(false);
    const translateY = useRef(new Animated.Value(Dimensions.get('window').height)).current;
    useEffect(() => {
        Animated.timing(translateY, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
        }).start();
    }, [translateY]);
    const onSubmitPressed = useCallback(() => {
        dispatch({
            type: DispatchAction.DID_AGREE_TO_TERMS,
            payload: [{ DidAgreeToTerms: TermsVersion }],
        });
    }, [dispatch]);
    const handleContentSizeChange = (width, height) => {
        setContentHeight(height);
    };
    const handleScrollViewLayout = useCallback((event) => {
        setScrollViewHeight(event.nativeEvent.layout.height);
    }, []);
    useEffect(() => {
        if (contentHeight > 0 && scrollViewHeight > 0) {
            setShowScrollbar(contentHeight > scrollViewHeight);
        }
    }, [contentHeight, scrollViewHeight]);
    const handleScroll = (event) => {
        const currentOffset = event.nativeEvent.contentOffset.y;
        if (contentHeight > 0 && scrollViewHeight > 0) {
            const isNearEnd = currentOffset >= contentHeight - scrollViewHeight - 10;
            if (isNearEnd && !scrolledToEnd) {
                setScrolledToEnd(true);
            }
        }
        scrollY.setValue(currentOffset);
    };
    const scrollIndicatorSize = showScrollbar ? Math.max(scrollViewHeight * (scrollViewHeight / contentHeight), 40) : 0;
    const scrollIndicatorPosition = scrollY.interpolate({
        inputRange: [0, Math.max(1, contentHeight - scrollViewHeight)],
        outputRange: [0, Math.max(0, scrollViewHeight - scrollIndicatorSize)],
        extrapolate: 'clamp',
    });
    const isCheckboxDisabled = hasPreviouslyAgreed || !scrolledToEnd;
    return (<GradientBackground>
      <Animated.View style={{ flex: 1, transform: [{ translateY }] }}>
        <View style={styles.container}>
          <CardModal style={styles.card} fullHeight customStyle={styles.cardModalCustomStyle}>
            <Text style={styles.title}>Terms And Conditions</Text>

            <View style={styles.scrollWrapper}>
              <ScrollView ref={scrollViewRef} contentContainerStyle={styles.scrollContentContainer} showsVerticalScrollIndicator={false} onScroll={handleScroll} scrollEventThrottle={16} onContentSizeChange={handleContentSizeChange} onLayout={handleScrollViewLayout}>
                <ThemedText style={styles.policyTitle}>Wallet Privacy Policy</ThemedText>
                <ThemedText style={styles.lastUpdated}>Last updated: 01.01.2026</ThemedText>

                <ThemedText style={styles.bodyText}>
                  {`Thank you for using the DigiCred Wallet mobile application! We are committed to protecting your privacy and, for that reason, we have adopted this Privacy Policy to explain the data collection, use, and disclosure practices related to the DigiCred Wallet services (including the DigiCred Wallet mobile application, and any other tools, products, or services provided by Digicred that link to or reference this Privacy Policy) (collectively, the “App”). The App is owned and operated by DigiCred Holdings, Inc., a Delaware corporation (“DigiCred”, “we”, “us” or “our”).\n\nThis Privacy Policy applies to your use of the App. It does not apply to information that you provide to any institutions through which you use the App (your “Institutions”). It also does not apply to information collected through the DigiCred website or our use of that information – please click here to view the `}
                  <ThemedText style={styles.linkText}>DigiCred website privacy policy.</ThemedText>
                  {`\n\nThis Privacy Policy describes, among other things:\n• The process for setting up and accessing the App;\n• Our information collection practices with regard to the App; and\n• How you may be able to exercise choices regarding the information your Institution(s) collect from you in the process of setting up the App or receives from and / or transmits to you through the App.`}
                </ThemedText>

                <ThemedText style={styles.bodyTextHeader}>1. Consent</ThemedText>
                <ThemedText style={styles.bodyText}>
                  {`By downloading, installing, accessing, or using the App, you consent to this Privacy Policy. If you do not agree with this Privacy Policy, please do not access or use the App. You agree that all transactions relating to the App or DigiCred are deemed to occur in the United States, where our servers are located.`}
                </ThemedText>

                <ThemedText style={styles.bodyTextHeader}>
                  2. Information Collected and Processed While Setting-Up and Using the App
                </ThemedText>
                <ThemedText style={styles.bodyText}>
                  {`When you set up, access, and/or use the App, `}
                  <ThemedText style={styles.boldText}>we do not collect any information from you</ThemedText>
                  {`, including any information that can identify or reasonably be linked to an individual (“Personal Information”). Because of this, we do not use, process, or disclose any information about you with regard to your use of the App, except if you choose to use your Institution’s Apply Marketplace Portal or the DigiCred Credential Analysis tool. Please review Section 3 for more information on how we collect, use, and disclose information in relation to those features.\n\nYour Institution may provide you with access to and/or the ability to use identification, credentials, or other documents (like your transcript) through the App. This Privacy Policy refers to those documents, collectively, as “Credentials”. The App only acts as a conduit to transmit and display these Credentials to you, and DigiCred does not have any access to or visibility of any information contained in the Credentials.\n\nTo enable you to use the App with respect to your Institution, your Institution will require you provide information, which may include Personal Information, in order to confirm your identity. This process takes place entirely offline, and DigiCred does not and will never have access to any information you provide to your Institution for identity verification.\n\nOnce it has confirmed your identity, your Institution will provide you with a QR code to scan through the App, which will provide you with access to a unique instance of the App. This instance is similar to an account, but does not require you to use a username and/or password and never collected any information from or about you or your use of the App – you just need to enter a PIN number.\n\nYou may choose to prevent the App from accessing certain features of your mobile device (subject to the controls offered by your mobile device’s operating system), but this may prevent you from receiving certain features of the App.`}
                </ThemedText>

                <ThemedText style={styles.bodyTextHeader}>
                  3. Information Collected, Processed, and Disclosed If You Use Apply Marketplace Portal or Credential
                  Analysis
                </ThemedText>
                <ThemedText style={styles.bodyText}>
                  {`Your Institution may, through the App, make the DigiCred Apply Marketplace Portal and Credential Analysis tool available to you. Your use of these functionalities is completely optional, and you may choose to use the App without using either functionality.\n\nIf you choose to use an Apply Marketplace Portal, we will not collect and/or have access to any of your Personal Information. If you elect to use an Apply Marketplace Portal, you may choose to share your Credentials, including Personal Information in your Credentials, with certain third parties, including schools, universities, employers, and other business partners of DigiCred who list opportunities in the Apply Marketplace Portal.\n\nIf you choose to use the Credential Analysis tool, we will only collect and process the types of Personal Information you choose to make available to us.\n\nFor more details on how we collect, process, and disclose information through the Apply Portal and Credential Analysis, please click here to view Apply Marketplace Portal privacy statement.`}
                </ThemedText>

                <ThemedText style={styles.bodyTextHeader}>
                  4. Your Institution’s Collection, Use, and Disclosure of Your Information; Other Disclosures of Your
                  Information
                </ThemedText>
                <ThemedText style={styles.bodyText}>
                  {`As noted above, your Institution may collect information from you, including Personal Information, when confirming your identity in order to facilitate your use of the App. Additionally, the Credentials your Institution provides to you through the App may contain information about you, including Personal Information.\n\nYour Institution’s collection, use, and disclosure of information is governed by the relevant polices of your Institution, and DigiCred is not responsible for those policies or the privacy or security practices of your Institution.\n\nThe App may also transmit Personal Information and non-Personal Information to Online Tool Providers. By “Online Tool Provider” we mean a licensor of software that we include in, or use with, the App, including an API or SDK, that provides a specialized function or service to us and that requires the transmission of Personal Information and/or non-Personal Information to the Online Tool Provider. Online Tool Providers may have the right to use Personal Information and non-Personal Information about you for their own business purposes. Use and disclosure of Personal Information and non-Personal Information by an Online Tool Provider is described in its privacy policy.\n\nWe may disclose your Personal Information to third parties when we believe, in good faith and in our sole discretion, that such disclosure is reasonably necessary to (a) enforce or apply the terms and conditions of the App, including investigation of potential violations thereof, (b) comply with legal or regulatory requirements or an enforceable governmental request, (c) protect the rights, property or safety of us, our users or other third parties, (d) submit insurance claims, cooperate with insurance investigations, and fulfil insurance subrogation activities, (e) prevent a crime or protect national security, or (f) detect, prevent or otherwise address fraud, security or technical issues.\n\nFinally, we reserve the right to transfer information (including your Personal Information) to a third party in the event of a sale, merger, or transfer of all or substantially all of the assets of our company relating to the App, or in the unlikely event of a bankruptcy, liquidation, or receivership of our business. We will use commercially reasonable efforts to notify you of such transfer, for example, via email or by posting notice on our website.`}
                </ThemedText>

                <ThemedText style={styles.bodyTextHeader}>5. Requests Related to Your Information</ThemedText>
                <ThemedText style={styles.bodyText}>
                  {`Unless you choose to use the Apply Marketplace Portal or Credential Analysis tools, we do not collect, process, or have access to any of your information, we cannot assist you in correcting inaccurate information in the Credentials or with deleting any of your information. Instead, you must contact your Institution to request any corrections in or deletion of your information.\n\nPlease be aware that if you request that the Institution providing credentials through the App to delete your information, including your Personal Information, you may not be able to continue to use the App.`}
                </ThemedText>

                <ThemedText style={styles.bodyTextHeader}>6. Certain State Residents</ThemedText>
                <ThemedText style={styles.bodyText}>
                  {`You may be aware that there are various state data privacy laws currently in effect in the United States. We are not currently subject to any state laws providing rights in connection with Personal Information.`}
                </ThemedText>

                <ThemedText style={styles.bodyTextHeader}>7. Residents of Nevada</ThemedText>
                <ThemedText style={styles.bodyText}>
                  {`We do not sell your Personal Information. However, you may contact us at info@DigiCred.co with questions.`}
                </ThemedText>

                <ThemedText style={styles.bodyTextHeader}>8. Children</ThemedText>
                <ThemedText style={styles.bodyText}>
                  {`The App is not intended for users under 13 years of age. We do not knowingly collect Personal Information from users under 13 years of age. We do not authorize users under 13 years of age to use the App.`}
                </ThemedText>

                <ThemedText style={styles.bodyTextHeader}>9. Information Security</ThemedText>
                <ThemedText style={styles.bodyText}>
                  {`We utilize reasonable information security measures to safeguard the App against unauthorized access, modification, or destruction. For example, we utilize Secure Socket Layer (SSL), Transport Layer Security (TLS), and/or similar decentralized encryption technology when sensitive data is transmitted over the Internet, and use firewalls to help prevent external access into our network.\n\nHowever, no data transmission over the Internet and no method of data storage can be guaranteed to be 100% secure. Therefore, you fully understand and agree that while we strive to use commercially acceptable means to protect the App, we cannot guarantee its security.`}
                </ThemedText>

                <ThemedText style={styles.bodyTextHeader}>10. Changes to this Policy</ThemedText>
                <ThemedText style={styles.bodyText}>
                  {`We may modify or update this Privacy Policy periodically with or without prior notice by posting the updated policy on this page. You can always check the “Last Updated” date at the top of this document to see when the Privacy Policy was last changed. If we make any material changes to this Privacy Policy, we will notify you by reasonable means, which may be posting a notice of the changes on our website or through our mobile app prior to the changes becoming effective. We encourage you to check this Privacy Policy from time to time. IF YOU DO NOT AGREE TO CHANGES TO THIS PRIVACY POLICY, YOU MUST STOP USING THE APP AFTER THE EFFECTIVE DATE OF SUCH CHANGES (WHICH IS THE “LAST UPDATED” DATE OF THIS PRIVACY POLICY).`}
                </ThemedText>

                <ThemedText style={styles.bodyTextHeader}>11. Questions</ThemedText>
                <ThemedText style={styles.bodyText}>
                  {`To ask questions about our Privacy Policy or to lodge a complaint, contact us at:\n\nDigiCred Holdings Inc.\nEmail: info@DigiCred.co`}
                </ThemedText>
              </ScrollView>

              {showScrollbar && (<View style={styles.scrollbarContainer}>
                  <Animated.View style={[
                styles.scrollbarThumb,
                {
                    height: scrollIndicatorSize,
                    transform: [{ translateY: scrollIndicatorPosition }],
                },
            ]}/>
                </View>)}
            </View>

            <View style={styles.checkboxContainer}>
              <TouchableOpacity testID={testIdWithKey('IAgree')} onPress={() => setChecked(!checked)} disabled={isCheckboxDisabled} style={[
            styles.checkbox,
            checked ? styles.checkboxChecked : {},
            isCheckboxDisabled ? styles.checkboxDisabled : {},
        ]}>
                {checked && <Text style={styles.checkmark}>✓</Text>}
              </TouchableOpacity>
              <ThemedText style={[
            styles.checkboxLabel,
            checked ? styles.checkboxLabelChecked : {},
            isCheckboxDisabled ? styles.checkboxLabelDisabled : {},
        ]}>
                I have read, understand and accept the terms and conditions.
              </ThemedText>
            </View>

            <DigiCredButton title={'CONTINUE'} onPress={onSubmitPressed} disabled={!checked && !hasPreviouslyAgreed} testID={testIdWithKey('Continue')} accessibilityLabel={'Continue'} variant="primary" customStyle={styles.buttonCustomStyle} customTextStyle={styles.buttonTextCustomStyle}/>
          </CardModal>
        </View>
      </Animated.View>
    </GradientBackground>);
};
const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    card: {
        marginTop: 40,
        flex: 1,
    },
    cardModalCustomStyle: {
        backgroundColor: DigiCredColors.card.modalBackground,
        borderRadius: 16,
        shadowColor: DigiCredColors.terms.shadow,
        shadowOffset: { width: 2, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 12,
        elevation: 5,
        maxHeight: Dimensions.get('window').height * 0.85,
        padding: 24,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 24,
        alignSelf: 'stretch',
        marginTop: 20,
        paddingBottom: 16,
    },
    title: {
        fontFamily: 'Open Sans',
        fontSize: 20,
        fontWeight: '400',
        lineHeight: 24,
        color: DigiCredColors.text.primary,
        width: '100%',
    },
    policyTitle: {
        fontFamily: 'Open Sans',
        fontSize: 20,
        fontWeight: '400',
        lineHeight: 24,
        color: DigiCredColors.text.primary,
        width: '100%',
        marginTop: 16,
        marginBottom: 8,
    },
    lastUpdated: {
        fontFamily: 'Open Sans',
        fontSize: 16,
        fontWeight: '400',
        lineHeight: 24,
        color: DigiCredColors.text.subtitle,
        width: '100%',
        marginBottom: 20,
    },
    bodyTextHeader: {
        fontFamily: 'Open Sans',
        fontSize: 16,
        fontWeight: '700',
        lineHeight: 24,
        color: DigiCredColors.text.primary,
        marginTop: 24,
        marginBottom: 8,
    },
    scrollWrapper: {
        flex: 1,
        width: '100%',
        position: 'relative',
    },
    scrollContentContainer: {
        paddingRight: 24,
        paddingBottom: 24,
    },
    bodyText: {
        fontFamily: 'Open Sans',
        fontSize: 16,
        fontWeight: '400',
        lineHeight: 24,
        color: DigiCredColors.text.subtitle,
        marginBottom: 24,
    },
    boldText: {
        fontFamily: 'Open Sans',
        fontSize: 16,
        lineHeight: 24,
        fontWeight: '700',
        color: DigiCredColors.text.primary,
    },
    linkText: {
        fontFamily: 'Open Sans',
        fontSize: 16,
        fontWeight: '400',
        lineHeight: 24,
        textDecorationLine: 'underline',
        color: DigiCredColors.text.subtitle,
    },
    checkboxContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        width: '100%',
    },
    checkbox: {
        width: 25,
        height: 25,
        borderWidth: 2,
        borderColor: DigiCredColors.terms.checkboxBorder,
        borderRadius: 4,
        marginRight: 10,
        justifyContent: 'center',
        alignItems: 'center',
        //marginTop: 10,
        paddingBottom: 5,
    },
    checkboxChecked: {
        backgroundColor: DigiCredColors.terms.checkboxChecked,
        borderColor: DigiCredColors.text.primary,
        borderWidth: 1,
    },
    checkboxDisabled: {
        opacity: 0.5,
    },
    checkmark: {
        marginTop: 3,
        color: DigiCredColors.text.primary,
        fontSize: 14,
        fontWeight: 'bold',
    },
    checkboxLabel: {
        fontFamily: 'Open Sans',
        fontSize: 16,
        fontWeight: '400',
        lineHeight: 24,
        color: DigiCredColors.text.subtitle,
        flex: 1,
    },
    checkboxLabelChecked: {
        color: DigiCredColors.text.primary,
    },
    checkboxLabelDisabled: {
        opacity: 0.5,
    },
    buttonCustomStyle: {
        display: 'flex',
        paddingVertical: 12,
        paddingHorizontal: 32,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 25,
        backgroundColor: DigiCredColors.button.continueButton,
        minWidth: 154,
        height: 48,
        opacity: 1,
        alignSelf: 'flex-start',
    },
    buttonTextCustomStyle: {
        fontFamily: 'Open Sans',
        fontSize: 16,
        fontWeight: '700',
        lineHeight: 24,
        color: DigiCredColors.text.primary,
        textTransform: 'none',
        letterSpacing: 0,
    },
    scrollbarContainer: {
        position: 'absolute',
        right: 8,
        top: 0,
        bottom: 0,
        width: 4,
        backgroundColor: DigiCredColors.terms.scrollbarTrack,
        borderRadius: 2,
        overflow: 'hidden',
    },
    scrollbarThumb: {
        position: 'absolute',
        right: 0,
        width: 4,
        borderRadius: 2,
        overflow: 'hidden',
        backgroundColor: DigiCredColors.terms.scrollbarThumb,
    },
});
export default Terms;
