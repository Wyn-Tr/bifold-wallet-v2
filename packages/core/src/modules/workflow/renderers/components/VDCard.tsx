
/**
 * VDCard - Visual Display Card
 *
 * Custom credential card component that displays student ID information
 * with support for different school card types.
 */

import React, { useEffect, useState } from 'react'
import { View, StyleSheet, Image, Platform, Dimensions, ViewStyle, ActivityIndicator } from 'react-native'
import { useTranslation } from 'react-i18next'

import { useTheme } from '../../../../contexts/theme'
import { ThemedText } from '../../../../components/texts/ThemedText'
import { isTablet as checkIsTablet } from '../../../../utils/device'

// Import SVG assets
import PenderLogo from '../../../../assets/img/PenderLogo.svg'
import NHCSLogo from '../../../../assets/img/NHCSlogo.svg'
import MiamiDadeLogo from '../../../../assets/img/MiamiDadeLogo.svg'
import Hat from '../../../../assets/img/hat.svg'
import CapeFearLogo from '../../../../assets/img/cape-fear-logo-new.svg'
import CfBuilding from '../../../../assets/img/cf-building.svg'

// Get screen dimensions
const { width: screenWidth } = Dimensions.get('window')

// Card aspect ratio constants
const CARD_WIDTH_RATIO = 350.0
const CARD_HEIGHT_RATIO = 219.69
const ASPECT_RATIO = CARD_WIDTH_RATIO / CARD_HEIGHT_RATIO

// More reliable device type detection
const isTabletDevice = screenWidth >= 768

interface DeviceSettings {
  nameScale: number
  detailsScale: number
  avatarScale: number
  logoScale: number
  barcodeScale: number
  logoMarginLeft: string
  infoGap: number
  infoBottomMargin: number
  barcodeBottomMargin: number
}

const deviceSettings: {
  phone: DeviceSettings & { chat: DeviceSettings }
  tablet: DeviceSettings & { chat: DeviceSettings }
} = {
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
    logoScale: 1.2,
    barcodeScale: 2,
    logoMarginLeft: Platform.OS === 'android' ? '-5%' : '-10%',
    infoGap: 2,
    infoBottomMargin: 15,
    barcodeBottomMargin: 80,
    chat: {
      nameScale: 1.2,
      detailsScale: 1.1,
      avatarScale: 1.11,
      logoScale: 0.9,
      barcodeScale: 1.0,
      logoMarginLeft: Platform.OS === 'android' ? '-14%' : '-18%',
      infoGap: 0,
      infoBottomMargin: 8,
      barcodeBottomMargin: 14,
    },
  },
}

enum CardType {
  DEFAULT = 'default',
  PENDER = 'pender',
  NHCS = 'nhcs',
  MIAMI = 'miami',
  CAPE_FEAR = 'cape_fear',
}

export interface VDCardProps {
  firstName: string
  lastName: string
  fullName?: string
  studentId: string
  school?: string
  issuerName?: string
  issueDate: string
  logoImage?: string
  avatarImage?: string
  barcodeImage?: string
  credDefId?: string
  isInChat?: boolean
  studentPhoto?: string
}

const getImageUri = (photo: string) => {
  return photo.startsWith('data:image') ? photo : `data:image/png;base64,${photo}`
}

const getScaledDimension = (originalValue: number, ratio: number) => {
  return originalValue * ratio
}

export const VDCard: React.FC<VDCardProps> = ({
                                                firstName,
                                                lastName,
                                                studentId,
                                                fullName,
                                                issueDate,
                                                school,
                                                credDefId,
                                                issuerName,
                                                isInChat = false,
                                                studentPhoto,
                                              }) => {
  const { t } = useTranslation()
  const { SettingsTheme } = useTheme()
  const [showDefaultCard, setShowDefaultCard] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const isTablet = checkIsTablet() || isTabletDevice


  const getCardType = (): CardType => {
    if (credDefId?.includes('NHCS') || credDefId?.includes('New Hanover')) {
      return CardType.NHCS
    } else if (credDefId?.includes('PCS') || credDefId?.includes('Pender')) {
      return CardType.PENDER
    } else if (credDefId?.includes('M-DCPS') || credDefId?.includes('Miami')) {
      return CardType.MIAMI
    } else if (credDefId?.includes('CFCC')) {
      return CardType.CAPE_FEAR
    } else {
      return CardType.DEFAULT
    }
  }

  const cardType = getCardType()

  useEffect(() => {
    if (cardType === CardType.DEFAULT && reloadKey === 0) {
      setShowDefaultCard(false)

      const timer = setTimeout(() => {
        setShowDefaultCard(true)
        const reloadTimer = setTimeout(() => {
          setReloadKey((prev) => prev + 1)
        }, 300)
        return () => clearTimeout(reloadTimer)
      }, 300)
      return () => clearTimeout(timer)
    } else {
      setShowDefaultCard(true)
    }
  }, [cardType, reloadKey])

  if (cardType === CardType.DEFAULT && !showDefaultCard) {
    return (
      <View style={[styles.cardContainer]}>
        <ActivityIndicator size="large" color={SettingsTheme.newSettingColors.buttonColor} />
      </View>
    )
  }

  const cardWidth = screenWidth * 0.85
  const cardHeight = cardWidth / ASPECT_RATIO
  const ratioFactor = cardWidth / CARD_WIDTH_RATIO

  const deviceType = isTablet ? 'tablet' : 'phone'
  const settingsToUse = isInChat ? deviceSettings[deviceType].chat : deviceSettings[deviceType]

  const baseFontSize = getScaledDimension(12, ratioFactor)
  const nameFontSize = baseFontSize * settingsToUse.nameScale
  const detailsFontSize = baseFontSize * settingsToUse.detailsScale
  const bottomLineHeight = getScaledDimension(25, ratioFactor)
  const infoGap = getScaledDimension(settingsToUse.infoGap, ratioFactor)
  const infoBottomMargin = getScaledDimension(settingsToUse.infoBottomMargin, ratioFactor)
  const barcodeBottomMargin = getScaledDimension(settingsToUse.barcodeBottomMargin, ratioFactor)

  const penderLogoSize = getScaledDimension(isTablet && !isInChat ? 120 : 100, ratioFactor)
  const hatSize = getScaledDimension(350, ratioFactor)

  const capeHeaderWidth = getScaledDimension(340, ratioFactor) * (isInChat ? 0.8 : 1.0)
  const capeHeaderHeight = getScaledDimension(50, ratioFactor) * (isInChat ? 0.8 : 1.0)

  const photoScaleFactor = isInChat ? 0.8 : 1.0
  const capePhotoHeight = getScaledDimension(isTablet && !isInChat ? 310 : 180, ratioFactor) * photoScaleFactor
  const capeFooterHeight = getScaledDimension(35, ratioFactor)
  const capeNameFontSize = getScaledDimension(16, ratioFactor)
  const capeDetailsFontSize = getScaledDimension(12, ratioFactor)

  const infoContainerStyle: ViewStyle = {
    ...styles.infoContainer,
    marginBottom: infoBottomMargin,
    marginTop: getScaledDimension(isTablet && !isInChat ? 100 : isTablet ? 20 : 10, ratioFactor),
    marginLeft: getScaledDimension(isTablet && !isInChat ? 20 : 0, ratioFactor),
  }

  const bottomLineColor =
    cardType === CardType.PENDER
      ? SettingsTheme.newSettingColors.schoolCardPender || '#172554'
      : cardType === CardType.NHCS
        ? SettingsTheme.newSettingColors.schoolCardNHCS || '#0065A4'
        : cardType === CardType.MIAMI
          ? SettingsTheme.newSettingColors.schoolCardMiami || '#23408F'
          : SettingsTheme.newSettingColors.buttonColor

  const getCardBackgroundColor = () => {
    if (cardType === CardType.CAPE_FEAR) return SettingsTheme.newSettingColors.schoolCardCapeFear || '#043564'
    if (cardType === CardType.PENDER || cardType === CardType.NHCS || cardType === CardType.MIAMI) return 'white'
    return SettingsTheme.newSettingColors.bgColorUp || '#1a2634'
  }

  const cardContainerStyle: ViewStyle = {
    backgroundColor: getCardBackgroundColor(),
    padding: getScaledDimension(cardType === CardType.CAPE_FEAR ? 0 : 10, ratioFactor),
  }

  const getLastSubstring = (str: string) => {
    return str.substring(str.lastIndexOf(':') + 1)
  }

  return (
    <View style={[styles.cardContainer, { width: cardWidth, height: cardHeight }]}>
      <View style={[styles.card, cardContainerStyle, { width: '100%', height: '100%' }]}>
        {cardType === CardType.CAPE_FEAR ? (
          <View style={[styles.capeCardContainer, { width: '100%', height: '100%' }]}>
            <View
              style={[
                styles.capeHeaderWrapper,
                { paddingTop: getScaledDimension(0, ratioFactor), paddingBottom: getScaledDimension(3, ratioFactor) },
              ]}
            >
              {!isInChat && isTablet ? (
                <Image
                  source={require('../../../../assets/img/CapeFearNewLogo.png')}
                  style={{
                    marginTop: getScaledDimension(5, ratioFactor),
                    width: getScaledDimension(200, ratioFactor),
                    height: getScaledDimension(60, ratioFactor),
                  }}
                />
              ) : (
                <CapeFearLogo
                  width={capeHeaderWidth}
                  height={capeHeaderHeight}
                  preserveAspectRatio="none"
                  style={{ alignSelf: 'center' }}
                />
              )}
            </View>

            <View
              style={[
                styles.capeContentRow,
                {
                  top: getScaledDimension(isInChat ? (isTablet ? 36 : 34) : isTablet ? 53 : 42, ratioFactor),
                  left: getScaledDimension(isInChat ? 20 : isTablet ? 15 : 13, ratioFactor),
                  right: getScaledDimension(isInChat ? 20 : isTablet ? 10 : 13, ratioFactor),
                },
              ]}
            >
              <View style={[styles.capePhotoContainer, { flex: 0.4, height: capePhotoHeight, overflow: 'hidden' }]}>
                {studentPhoto ? (
                  <Image source={{ uri: getImageUri(studentPhoto) }} style={styles.capeStudentPhoto} />
                ) : (
                  <Image
                    source={require('../../../../assets/img/fallback-student-image.png')}
                    style={styles.capeFallbackPhoto}
                  />
                )}
              </View>

              <View
                style={{
                  flex: 0.6,
                  height: capePhotoHeight,
                  overflow: 'hidden',
                  justifyContent: 'flex-start',
                  alignItems: 'flex-start',
                }}
              >
                <CfBuilding
                  width="100%"
                  height={capePhotoHeight * 1.2}
                  preserveAspectRatio="none"
                  style={{ marginTop: getScaledDimension(-10, ratioFactor) }}
                />
              </View>
            </View>

            <View
              style={[
                styles.capeFooterContainer,
                {
                  height: capeFooterHeight,
                  paddingBottom: getScaledDimension(isInChat ? 6 : 8, ratioFactor),
                  paddingTop: getScaledDimension(isInChat ? 0 : 0, ratioFactor),
                  paddingLeft: getScaledDimension(13, ratioFactor),
                  paddingRight: getScaledDimension(13, ratioFactor),
                },
              ]}
            >
              <View style={{ flexDirection: 'column', marginLeft: getScaledDimension(isInChat ? 6 : 0, ratioFactor) }}>
                <ThemedText
                  style={[styles.capeName, { fontSize: capeNameFontSize * (isInChat ? 0.8 : 1), color: '#FFFFFF' }]}
                >
                  {fullName || `${firstName} ${lastName}`}
                </ThemedText>
                <ThemedText style={[styles.capeDetails, { fontSize: capeDetailsFontSize, color: '#FFFFFF' }]}>
                  {t('Transcript.StudentID' as any)}: {studentId}
                </ThemedText>
              </View>
              <View style={styles.capeExpirationContainer}>
                <ThemedText style={[styles.capeExpirationLabel, { fontSize: capeDetailsFontSize, color: '#FFFFFF' }]}>
                  {t('Transcript.exp. date' as any)}
                </ThemedText>
                <ThemedText style={[styles.capeExpirationValue, { fontSize: capeDetailsFontSize, color: '#FFFFFF' }]}>
                  {issueDate}
                </ThemedText>
              </View>
            </View>
          </View>
        ) : (
          <>
            <View
              style={[
                styles.leftSection,
                { marginTop: getScaledDimension(isTablet && !isInChat ? 20 : 0, ratioFactor) },
              ]}
            >
              {cardType === CardType.DEFAULT && (
                <View>
                  <ThemedText
                    style={[
                      styles.institution,
                      {
                        color: SettingsTheme.newSettingColors.headerTitle,
                        fontSize: getScaledDimension(12, ratioFactor),
                        marginLeft: getScaledDimension(15, ratioFactor),
                        marginTop: getScaledDimension(15, ratioFactor),
                      },
                    ]}
                  >
                    {issuerName}
                  </ThemedText>
                </View>
              )}
              {cardType === CardType.PENDER && (
                <View style={[styles.penderHeader, { marginTop: getScaledDimension(10, ratioFactor) }]}>
                  <ThemedText
                    style={[
                      styles.penderTitle,
                      {
                        fontSize: nameFontSize * 0.9,
                        marginLeft: getScaledDimension(isTablet && !isInChat ? 20 : 0, ratioFactor),
                        color: '#333333',
                      },
                    ]}
                  >
                    {t('Transcript.DistrictName' as any)}: Pender County Schools
                  </ThemedText>
                </View>
              )}
              {cardType === CardType.NHCS && (
                <View style={[styles.penderHeader, { marginTop: getScaledDimension(10, ratioFactor) }]}>
                  <ThemedText
                    style={[
                      styles.penderTitle,
                      {
                        fontSize: nameFontSize * 0.9,
                        marginLeft: getScaledDimension(isTablet && !isInChat ? 20 : 0, ratioFactor),
                        color: '#333333',
                      },
                    ]}
                  >
                    {t('Transcript.DistrictName' as any)}: New Hanover County Schools
                  </ThemedText>
                </View>
              )}
              {cardType === CardType.MIAMI && (
                <View style={[styles.penderHeader, { marginTop: getScaledDimension(10, ratioFactor) }]}>
                  <ThemedText
                    style={[
                      styles.penderTitle,
                      {
                        fontSize: nameFontSize * 0.9,
                        marginLeft: getScaledDimension(isTablet && !isInChat ? 20 : 0, ratioFactor),
                        color: '#333333',
                      },
                    ]}
                  >
                    {t('Transcript.DistrictName' as any)}: Miami-Dade County Schools
                  </ThemedText>
                </View>
              )}
              <View style={infoContainerStyle}>
                {cardType === CardType.DEFAULT ? (
                  <View
                    style={[
                      styles.defaultBody,
                      {
                        justifyContent: 'center',
                        height: '70%',
                        marginLeft: getScaledDimension(15, ratioFactor),
                      },
                    ]}
                  >
                    <ThemedText
                      style={[
                        styles.defaultText,
                        {
                          color: SettingsTheme.newSettingColors.headerTitle,
                          fontSize: getScaledDimension(18, ratioFactor),
                        },
                      ]}
                    >
                      {(() => {
                        const tag = getLastSubstring(credDefId || ':')
                        // Show school/schema name if tag is "default", otherwise show the tag
                        if (tag.toLowerCase() === 'default') return school || fullName || tag
                        return tag
                      })()}
                    </ThemedText>
                    {fullName && school && (
                      <ThemedText
                        style={[
                          styles.defaultText,
                          {
                            color: SettingsTheme.newSettingColors.headerTitle,
                            fontSize: getScaledDimension(14, ratioFactor),
                            opacity: 0.8,
                            marginTop: getScaledDimension(4, ratioFactor),
                          },
                        ]}
                      >
                        {fullName}
                      </ThemedText>
                    )}
                  </View>
                ) : (
                  <>
                    <ThemedText
                      style={[
                        styles.name,
                        {
                          fontSize: nameFontSize,
                          color: '#333333',
                          marginTop: getScaledDimension(isInChat ? 25 : 5, ratioFactor),
                          marginBottom: getScaledDimension(6, ratioFactor),
                        },
                      ]}
                    >
                      {(cardType === CardType.PENDER || cardType === CardType.NHCS || cardType === CardType.MIAMI) &&
                      fullName
                        ? fullName
                        : `${firstName} ${lastName}`}
                    </ThemedText>
                    {(cardType === CardType.PENDER || cardType === CardType.NHCS || cardType === CardType.MIAMI) &&
                      school && (
                        <ThemedText
                          style={[
                            styles.details,
                            {
                              fontSize: detailsFontSize,
                              marginBottom: infoGap,
                              color: '#333333',
                            },
                          ]}
                        >
                          {t('Chat.School' as any)}: {school}
                        </ThemedText>
                      )}
                    <ThemedText
                      style={[
                        styles.details,
                        {
                          fontSize: detailsFontSize,
                          marginBottom: infoGap,
                          color: '#333333',
                        },
                      ]}
                    >
                      {t('Chat.StudentID' as any)}: {studentId}
                    </ThemedText>
                    <ThemedText
                      style={[
                        styles.details,
                        {
                          fontSize: detailsFontSize,
                          marginBottom: infoGap,
                          color: '#333333',
                        },
                      ]}
                    >
                      {t('Chat.Expiration' as any)}: {issueDate}
                    </ThemedText>
                  </>
                )}
              </View>

              {cardType === CardType.DEFAULT && (
                <View style={[styles.barcodeContainer, { marginBottom: barcodeBottomMargin }]} />
              )}
            </View>

            {cardType === CardType.DEFAULT ? (
              <View style={styles.rightSection} />
            ) : cardType === CardType.PENDER ? (
              <>
                <View style={[styles.penderRightSection, { top: '35%', right: '10%' }]}>
                  <PenderLogo width={penderLogoSize} height={penderLogoSize} />
                </View>
                <View style={styles.hatContainer}>
                  <Hat width={hatSize} height={hatSize} />
                </View>
              </>
            ) : cardType === CardType.NHCS ? (
              <>
                <View style={[styles.penderRightSection, { top: '35%', right: '10%' }]}>
                  <NHCSLogo width={penderLogoSize} height={penderLogoSize} />
                </View>
                <View style={styles.hatContainer}>
                  <Hat width={hatSize} height={hatSize} />
                </View>
              </>
            ) : cardType === CardType.MIAMI ? (
              <>
                <View style={[styles.penderRightSection, { top: '35%', right: '10%' }]}>
                  <MiamiDadeLogo width={penderLogoSize} height={penderLogoSize} />
                </View>
                <View style={styles.hatContainer}>
                  <Hat width={hatSize} height={hatSize} />
                </View>
              </>
            ) : null}

            <View style={[styles.bottomLine, { height: bottomLineHeight, backgroundColor: bottomLineColor }]} />
          </>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  cardContainer: {
    alignSelf: 'center',
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  card: {
    borderRadius: 10,
    flexDirection: 'row',
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
    fontWeight: '600',
    color: '#333333',
  },
  details: {
    fontWeight: '400',
    color: '#333333',
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
  penderHeader: {
    width: '100%',
  },
  penderTitle: {
    fontWeight: 'bold',
    color: '#333333',
  },
  penderRightSection: {
    position: 'absolute',
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
  capeCardContainer: {
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
    height: '120%',
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
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
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
    fontWeight: 'bold',
    fontFamily: 'OpenSans-Regular',
    color: '#333333',
  },
  defaultText: {
    fontWeight: 'bold',
    fontFamily: 'OpenSans-Regular',
    color: '#333333',
  },
  defaultBody: {
    justifyContent: 'center',
  },
})

export default VDCard
