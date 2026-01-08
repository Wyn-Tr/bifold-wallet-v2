/**
 * VDCard - Visual Display Card
 *
 * Custom credential card component that displays student ID information
 * with support for different school card types (Pender, NHCS, Miami, Cape Fear).
 */
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Image, Platform, Dimensions, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../../contexts/theme';
import { ThemedText } from '../../../../components/texts/ThemedText';
import { isTablet as checkIsTablet } from '../../../../utils/device';
// Import SVG assets
import PenderLogo from '../../../../assets/img/PenderLogo.svg';
import NHCSLogo from '../../../../assets/img/NHCSlogo.svg';
import MiamiDadeLogo from '../../../../assets/img/MiamiDadeLogo.svg';
import Hat from '../../../../assets/img/hat.svg';
import CapeFearLogo from '../../../../assets/img/cape-fear-logo-new.svg';
import CfBuilding from '../../../../assets/img/cf-building.svg';
// Get screen dimensions
const { width: screenWidth } = Dimensions.get('window');
// More reliable device type detection
const isTabletDevice = screenWidth >= 768;
const deviceSettings = {
    phone: {
        nameScale: 1.5,
        detailsScale: 1.3,
        avatarScale: 1.4,
        logoScale: 1.4,
        barcodeScale: 1.3,
        logoMarginLeft: Platform.OS === 'android' ? '-5%' : '-10%',
        infoGap: 2,
        infoBottomMargin: 10,
        barcodeBottomMargin: 20,
        chat: {
            nameScale: 1.1,
            detailsScale: 1.0,
            avatarScale: 1.0,
            logoScale: 1.0,
            barcodeScale: 1.0,
            logoMarginLeft: Platform.OS === 'android' ? '-10%' : '-15%',
            infoGap: 0,
            infoBottomMargin: 5,
            barcodeBottomMargin: 20,
        },
    },
    tablet: {
        nameScale: 1.8,
        detailsScale: 1.6,
        avatarScale: 2.6,
        logoScale: 1.8,
        barcodeScale: 2,
        logoMarginLeft: Platform.OS === 'android' ? '-5%' : '-10%',
        infoGap: 2,
        infoBottomMargin: 15,
        barcodeBottomMargin: 80,
        chat: {
            nameScale: 1.2,
            detailsScale: 1.1,
            avatarScale: 1.11,
            logoScale: 1.2,
            barcodeScale: 1.0,
            logoMarginLeft: Platform.OS === 'android' ? '-14%' : '-18%',
            infoGap: 0,
            infoBottomMargin: 8,
            barcodeBottomMargin: 14,
        },
    },
};
// Define card types
var CardType;
(function (CardType) {
    CardType["DEFAULT"] = "default";
    CardType["PENDER"] = "pender";
    CardType["NHCS"] = "nhcs";
    CardType["MIAMI"] = "miami";
    CardType["CAPE_FEAR"] = "cape_fear";
})(CardType || (CardType = {}));
const getImageUri = (photo) => {
    return photo.startsWith('data:image') ? photo : `data:image/png;base64,${photo}`;
};
export const VDCard = ({ firstName, lastName, studentId, fullName, issueDate, school, credDefId, issuerName, isInChat = false, studentPhoto, }) => {
    const { t } = useTranslation();
    const { SettingsTheme } = useTheme();
    const [showDefaultCard, setShowDefaultCard] = useState(false);
    const [reloadKey, setReloadKey] = useState(0);
    const isTablet = checkIsTablet() || isTabletDevice;
    // Determine card type based on issuer name
    const getCardType = () => {
        if (credDefId?.includes('NHCS') || credDefId?.includes('New Hanover')) {
            return CardType.NHCS;
        }
        else if (credDefId?.includes('PCS') || credDefId?.includes('Pender')) {
            return CardType.PENDER;
        }
        else if (credDefId?.includes('M-DCPS') || credDefId?.includes('Miami')) {
            return CardType.MIAMI;
        }
        else if (credDefId?.includes('CFCC')) {
            return CardType.CAPE_FEAR;
        }
        else {
            return CardType.DEFAULT;
        }
    };
    const cardType = getCardType();
    useEffect(() => {
        if (cardType === CardType.DEFAULT && reloadKey === 0) {
            setShowDefaultCard(false);
            const timer = setTimeout(() => {
                setShowDefaultCard(true);
                const reloadTimer = setTimeout(() => {
                    setReloadKey((prev) => prev + 1);
                }, 300);
                return () => clearTimeout(reloadTimer);
            }, 300);
            return () => clearTimeout(timer);
        }
        else {
            setShowDefaultCard(true);
        }
    }, [cardType, reloadKey]);
    if (cardType === CardType.DEFAULT && !showDefaultCard) {
        return (<View style={[styles.card]}>
        <ActivityIndicator size="large" color={SettingsTheme.newSettingColors.buttonColor}/>
      </View>);
    }
    // The aspect ratio of the original card
    const aspectRatio = 350.0 / 219.69;
    // Apply a very conservative scale factor
    const baseScaleFactor = isTablet ? (isInChat ? 1.0 : 1.2) : 0.9;
    // Get device-specific settings
    const deviceType = isTablet ? 'tablet' : 'phone';
    const settingsToUse = isInChat ? deviceSettings[deviceType].chat : deviceSettings[deviceType];
    const nameFontSize = 12 * baseScaleFactor * settingsToUse.nameScale;
    const detailsFontSize = 12 * baseScaleFactor * settingsToUse.detailsScale;
    const bottomLineHeight = 25 * baseScaleFactor;
    const infoGap = settingsToUse.infoGap;
    const infoBottomMargin = settingsToUse.infoBottomMargin;
    // Pender specific dimensions
    const penderLogoSize = (isTablet && !isInChat ? 150 : 100) * baseScaleFactor;
    const hatSize = 350 * baseScaleFactor;
    // Cape Fear specific dimensions
    const capeHeaderWidth = 340 * baseScaleFactor * (isInChat ? 0.8 : 1.0);
    const capeHeaderHeight = 50 * baseScaleFactor * (isInChat ? 0.8 : 1.0);
    const photoScaleFactor = isInChat ? 0.8 : 1.0;
    const capePhotoHeight = (isTablet && !isInChat ? 310 : 180) * baseScaleFactor * photoScaleFactor;
    const capeFooterHeight = 35 * baseScaleFactor;
    const capeNameFontSize = 16 * baseScaleFactor;
    const capeDetailsFontSize = 12 * baseScaleFactor;
    const infoContainerStyle = {
        ...styles.infoContainer,
        marginBottom: infoBottomMargin,
        marginTop: isTablet && !isInChat ? 100 : isTablet ? 20 : 10,
        marginLeft: isTablet && !isInChat ? 20 : 0,
    };
    // Define bottom line color based on card type using theme colors with fallbacks
    const bottomLineColor = cardType === CardType.PENDER
        ? SettingsTheme.newSettingColors.schoolCardPender || '#172554'
        : cardType === CardType.NHCS
            ? SettingsTheme.newSettingColors.schoolCardNHCS || '#0065A4'
            : cardType === CardType.MIAMI
                ? SettingsTheme.newSettingColors.schoolCardMiami || '#23408F'
                : SettingsTheme.newSettingColors.buttonColor;
    // Cape Fear has dark blue background, branded school cards (Pender, NHCS, Miami) are light,
    // DEFAULT type adapts to theme
    const getCardBackgroundColor = () => {
        if (cardType === CardType.CAPE_FEAR)
            return SettingsTheme.newSettingColors.schoolCardCapeFear || '#043564';
        if (cardType === CardType.PENDER || cardType === CardType.NHCS || cardType === CardType.MIAMI)
            return 'white';
        // DEFAULT type uses theme color
        return SettingsTheme.newSettingColors.bgColorUp || '#1a2634';
    };
    const cardContainerStyle = {
        backgroundColor: getCardBackgroundColor(),
        padding: cardType === CardType.CAPE_FEAR ? 0 : 10,
    };
    const getLastSubstring = (str) => {
        return str.substring(str.lastIndexOf(':') + 1);
    };
    return (<View style={[
            styles.card,
            cardContainerStyle,
            {
                width: '90%',
                aspectRatio: aspectRatio,
            },
            // isInChat
            //   ? {
            //       width: isTablet ? 320 : 280,
            //       height: isTablet ? 215 : 175,
            //     }
            //   : {
            //       width: '100%',
            //       aspectRatio: aspectRatio,
            //     },
        ]}>
      {cardType === CardType.CAPE_FEAR ? (
        // Cape Fear Card Layout
        <View style={styles.capeCardContainer}>
          {/* Cape Fear Header Logo */}
          <View style={styles.capeHeaderWrapper}>
            {!isInChat && isTablet ? (<Image source={require('../../../../assets/img/CapeFearNewLogo.png')} style={{ marginTop: 5 }}/>) : (<CapeFearLogo width={capeHeaderWidth} height={capeHeaderHeight} preserveAspectRatio="none" style={{ alignSelf: 'center' }}/>)}
          </View>

          {/* Two-column layout for photo and building */}
          <View style={[
                styles.capeContentRow,
                {
                    top: isInChat ? (isTablet ? 36 : 34) * baseScaleFactor : isTablet ? 53 : 42,
                    left: isInChat ? 20 : isTablet ? 15 : 13,
                    right: isInChat ? 20 : isTablet ? 10 : 13,
                },
            ]}>
            {/* Left column - Photo placeholder (40%) */}
            <View style={[styles.capePhotoContainer, { flex: 0.4, height: capePhotoHeight, overflow: 'hidden' }]}>
              {studentPhoto ? (<Image source={{ uri: getImageUri(studentPhoto) }} style={styles.capeStudentPhoto}/>) : (<Image source={require('../../../../assets/img/fallback-student-image.png')} style={styles.capeFallbackPhoto}/>)}
            </View>

            {/* Right column - Building (60%) */}
            <View style={{
                flex: 0.6,
                height: capePhotoHeight,
                overflow: 'hidden',
                justifyContent: 'flex-start',
                alignItems: 'flex-start',
            }}>
              <CfBuilding width="100%" height={capePhotoHeight * 1.2} preserveAspectRatio="none" style={{ marginTop: -10 }}/>
            </View>
          </View>

          {/* Footer with student info */}
          <View style={[
                styles.capeFooterContainer,
                { height: capeFooterHeight, paddingBottom: isInChat ? 6 : 8, paddingTop: isInChat ? 0 : 0 },
            ]}>
            <View style={{ flexDirection: 'column', marginLeft: isInChat ? 6 : 0 }}>
              <ThemedText style={[styles.capeName, { fontSize: capeNameFontSize * (isInChat ? 0.8 : 1) }]}>
                {fullName || `${firstName} ${lastName}`}
              </ThemedText>
              <ThemedText style={[styles.capeDetails, { fontSize: capeDetailsFontSize }]}>
                {t('Transcript.StudentID')}: {studentId}
              </ThemedText>
            </View>
            <View style={styles.capeExpirationContainer}>
              <ThemedText style={[styles.capeExpirationLabel, { fontSize: capeDetailsFontSize }]}>
                {t('Transcript.exp. date')}
              </ThemedText>
              <ThemedText style={[styles.capeExpirationValue, { fontSize: capeDetailsFontSize }]}>
                {issueDate}
              </ThemedText>
            </View>
          </View>
        </View>) : (
        // All other card types
        <>
          <View style={[styles.leftSection, { marginTop: isTablet && !isInChat ? 20 : 0 }]}>
            {/* Logo Section */}
            {cardType === CardType.DEFAULT && (<View>
                <ThemedText style={[styles.institution, { color: SettingsTheme.newSettingColors.headerTitle }]}>
                  {issuerName}
                </ThemedText>
              </View>)}
            {cardType === CardType.PENDER && (<View style={styles.penderHeader}>
                <ThemedText style={[
                    styles.penderTitle,
                    { fontSize: nameFontSize * 0.9, marginLeft: isTablet && !isInChat ? 20 : 0 },
                ]}>
                  {t('Transcript.DistrictName')}: Pender County Schools
                </ThemedText>
              </View>)}
            {cardType === CardType.NHCS && (<View style={styles.penderHeader}>
                <ThemedText style={[
                    styles.penderTitle,
                    { fontSize: nameFontSize * 0.9, marginLeft: isTablet && !isInChat ? 20 : 0 },
                ]}>
                  {t('Transcript.DistrictName')}: New Hanover County Schools
                </ThemedText>
              </View>)}
            {cardType === CardType.MIAMI && (<View style={styles.penderHeader}>
                <ThemedText style={[
                    styles.penderTitle,
                    { fontSize: nameFontSize * 0.9, marginLeft: isTablet && !isInChat ? 20 : 0 },
                ]}>
                  {t('Transcript.DistrictName')}: Miami-Dade County Schools
                </ThemedText>
              </View>)}
            <View style={infoContainerStyle}>
              {cardType === CardType.DEFAULT ? (<View style={styles.defaultBody}>
                  <ThemedText style={[styles.defaultText, { color: SettingsTheme.newSettingColors.headerTitle }]}>
                    {getLastSubstring(credDefId || ':')}
                  </ThemedText>
                </View>) : (<>
                  <ThemedText style={[styles.name, { fontSize: nameFontSize, color: SettingsTheme.newSettingColors.headerTitle }]}>
                    {(cardType === CardType.PENDER || cardType === CardType.NHCS || cardType === CardType.MIAMI) &&
                    fullName
                    ? fullName
                    : `${firstName} ${lastName}`}
                  </ThemedText>
                  {(cardType === CardType.PENDER || cardType === CardType.NHCS || cardType === CardType.MIAMI) &&
                    school && (<ThemedText style={[
                        styles.details,
                        {
                            fontSize: detailsFontSize,
                            marginBottom: infoGap,
                            color: SettingsTheme.newSettingColors.headerTitle,
                        },
                    ]}>
                        {t('Chat.School')}: {school}
                      </ThemedText>)}
                  <ThemedText style={[
                    styles.details,
                    {
                        fontSize: detailsFontSize,
                        marginBottom: infoGap,
                        color: SettingsTheme.newSettingColors.headerTitle,
                    },
                ]}>
                    {t('Chat.StudentID')}: {studentId}
                  </ThemedText>
                  <ThemedText style={[
                    styles.details,
                    {
                        fontSize: detailsFontSize,
                        marginBottom: infoGap,
                        color: SettingsTheme.newSettingColors.headerTitle,
                    },
                ]}>
                    {t('Chat.Expiration')}: {issueDate}
                  </ThemedText>
                </>)}
            </View>

            {/* Barcode only for default */}
            {cardType === CardType.DEFAULT && (<View style={[styles.barcodeContainer, { marginBottom: settingsToUse.barcodeBottomMargin }]}/>)}
          </View>

          {/* Right Section */}
          {cardType === CardType.DEFAULT ? (<View style={styles.rightSection}/>) : cardType === CardType.PENDER ? (<>
              <View style={styles.penderRightSection}>
                <PenderLogo width={penderLogoSize} height={penderLogoSize}/>
              </View>
              <View style={styles.hatContainer}>
                <Hat width={hatSize} height={hatSize}/>
              </View>
            </>) : cardType === CardType.NHCS ? (<>
              <View style={styles.penderRightSection}>
                <NHCSLogo width={penderLogoSize} height={penderLogoSize}/>
              </View>
              <View style={styles.hatContainer}>
                <Hat width={hatSize} height={hatSize}/>
              </View>
            </>) : cardType === CardType.MIAMI ? (<>
              <View style={styles.penderRightSection}>
                <MiamiDadeLogo width={penderLogoSize} height={penderLogoSize}/>
              </View>
              <View style={styles.hatContainer}>
                <Hat width={hatSize} height={hatSize}/>
              </View>
            </>) : null}

          {/* Bottom line */}
          <View style={[styles.bottomLine, { height: bottomLineHeight, backgroundColor: bottomLineColor }]}/>
        </>)}
    </View>);
};
const styles = StyleSheet.create({
    card: {
        marginTop: 28,
        borderRadius: 10,
        flexDirection: 'row',
        padding: 10,
        overflow: 'hidden',
        position: 'relative',
    },
    leftSection: {
        flex: 2,
        paddingRight: 10,
        height: '100%',
        justifyContent: 'flex-start',
    },
    infoContainer: {
        marginTop: 20,
    },
    name: {
        marginTop: 10,
        marginBottom: 6,
    },
    details: {
        marginBottom: 2,
    },
    barcodeContainer: {
        marginTop: 'auto',
        display: 'flex',
        alignItems: 'flex-start',
    },
    rightSection: {
        flex: 1,
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'flex-end',
    },
    bottomLine: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        borderBottomLeftRadius: 10,
        borderBottomRightRadius: 10,
    },
    // Pender specific styles
    penderHeader: {
        width: '100%',
        marginTop: 10,
    },
    penderTitle: {
        color: '#333333',
        fontWeight: 'bold',
    },
    penderRightSection: {
        position: 'absolute',
        top: '35%',
        right: '10%',
    },
    hatContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        opacity: 0.6,
    },
    // Cape Fear specific styles
    capeCardContainer: {
        width: '100%',
        height: '100%',
        backgroundColor: '#043564',
        borderRadius: 10,
        borderWidth: 0,
        position: 'relative',
        overflow: 'hidden',
    },
    capeHeaderWrapper: {
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 0,
        paddingBottom: 3,
    },
    capeContentRow: {
        flexDirection: 'row',
        position: 'absolute',
    },
    capePhotoContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 0,
    },
    capeStudentPhoto: {
        width: '100%',
        height: '125%',
        resizeMode: 'cover',
        borderRadius: 0,
        alignSelf: 'center',
    },
    capeFallbackPhoto: {
        width: '120%',
        height: '100%',
        resizeMode: 'cover',
        borderRadius: 0,
    },
    capeFooterContainer: {
        position: 'absolute',
        width: '100%',
        bottom: 0,
        left: 0,
        backgroundColor: '#043564',
        paddingBottom: 8,
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        paddingLeft: 13,
        paddingRight: 13,
    },
    capeName: {
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    capeDetails: {
        color: '#FFFFFF',
    },
    capeExpirationContainer: {
        alignItems: 'flex-end',
        justifyContent: 'flex-end',
    },
    capeExpirationLabel: {
        color: '#FFFFFF',
    },
    capeExpirationValue: {
        color: '#FFFFFF',
    },
    institution: {
        fontSize: 12,
        marginLeft: 15,
        marginTop: 15,
        fontWeight: 'bold',
        fontFamily: 'OpenSans-Regular',
    },
    defaultText: {
        fontSize: 18,
        fontWeight: 'bold',
        fontFamily: 'OpenSans-Regular',
    },
    defaultBody: {
        justifyContent: 'center',
        height: '70%',
        marginLeft: 15,
    },
});
export default VDCard;
