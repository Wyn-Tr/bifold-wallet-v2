import React, { useMemo } from 'react'
import { CredentialDisplay, DisplayImage, W3cCredentialDisplay } from '../types'
import { useTranslation } from 'react-i18next'
import { GenericFn } from '../../../types/fn'
import {
  DeviceEventEmitter,
  Image,
  ImageBackground,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  ViewStyle,
  TouchableOpacity,
} from 'react-native'
import { testIdWithKey } from '../../../utils/testable'
import { credentialTextColor, toImageSource } from '../../../utils/credential'
import { useTheme } from '../../../contexts/theme'
import { SvgUri } from 'react-native-svg'
import { MdocRecord, SdJwtVcRecord, W3cCredentialRecord } from '@credo-ts/core'
import { OpenBadgeCredentialRecord } from '@ajna-inc/openbadges'
import { JsonLdCredentialRecord } from '../jsonLd/JsonLdCredentialRecord'
import { getCredentialForDisplay } from '../display'
import { BifoldError } from '../../../types/error'
import { EventTypes } from '../../../constants'
import { Attribute } from '@bifold/oca/build/legacy'
import { getAttributeField } from '../../../utils/oca'
import { useCredentialErrorsFromRegistry } from '../hooks/useCredentialErrorsFromRegistry'
import { CredentialErrors } from '../../../types/credentials'

interface CredentialCardProps {
  credentialDisplay?: W3cCredentialDisplay
  credentialRecord?:
    | W3cCredentialRecord
    | SdJwtVcRecord
    | MdocRecord
    | OpenBadgeCredentialRecord
    | JsonLdCredentialRecord
  onPress?: GenericFn
  style?: ViewStyle
}

const paddingVertical = 10
const paddingHorizontal = 10
const transparent = 'rgba(0,0,0,0)'
const borderRadius = 15
const borderPadding = 8

const InvalidBadge: React.FC<{ isInvalid: boolean }> = ({ isInvalid }) => {
  const { ColorPalette, TextTheme } = useTheme()

  const styles = StyleSheet.create({
    badgeWrap: {
      position: 'absolute',
      top: 8,
      right: 8,
      backgroundColor: ColorPalette.notification.error,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    badgeText: {
      ...TextTheme.label,
      color: '#fff',
      fontWeight: '700',
      fontSize: 12,
    },
  })
  if (!isInvalid) return null
  return (
    <View style={styles.badgeWrap} testID={testIdWithKey('CredentialInvalidBadge')}>
      <Text style={styles.badgeText}>Invalid</Text>
    </View>
  )
}

const OpenIDCredentialCard: React.FC<CredentialCardProps> = ({
  credentialDisplay,
  credentialRecord,
  style = {},
  onPress = undefined,
}) => {
  const { t } = useTranslation()
  const { ColorPalette, TextTheme } = useTheme()

  const computedErrors = useCredentialErrorsFromRegistry(credentialRecord, [])
  const isInvalid = useMemo(() => {
    return computedErrors.includes(CredentialErrors.Revoked)
  }, [computedErrors])

  const credentialForDisplay = useMemo((): W3cCredentialDisplay | undefined => {
    if (credentialDisplay) return credentialDisplay
    if (!credentialRecord) return undefined
    return getCredentialForDisplay(credentialRecord as W3cCredentialRecord)
  }, [credentialDisplay, credentialRecord])

  const display = useMemo((): CredentialDisplay | undefined => {
    if (credentialForDisplay) return credentialForDisplay.display

    if (!credentialRecord) {
      const error = new BifoldError(
        t('Error.Title1047'),
        t('Error.Message1047'),
        'Error[Logical] credentialDisplay and credentialRecord are undefined',
        1047
      )
      DeviceEventEmitter.emit(EventTypes.ERROR_ADDED, error)
      return
    }
    const result = getCredentialForDisplay(credentialRecord as W3cCredentialRecord)
    return result.display
  }, [credentialForDisplay, credentialRecord, t])

  const overlayAttributeField = useMemo((): Attribute | undefined => {
    const sourceDisplay = credentialForDisplay
    if (!sourceDisplay) return undefined

    const fallbackOrder = [
      display?.primary_overlay_attribute,
      'license_number',
      'student_id',
      'document_number',
      'id',
      'given_name',
      'family_name',
      'name',
      ...Object.keys(sourceDisplay.attributes || {}),
    ].filter((v): v is string => !!v)

    for (const key of fallbackOrder) {
      const field = getAttributeField(sourceDisplay, key)?.field
      if (field && field.value !== undefined && field.value !== null && String(field.value).length > 0) {
        return field
      }
    }

    return undefined
  }, [display?.primary_overlay_attribute, credentialForDisplay])

  const { width } = useWindowDimensions()
  const cardHeight = width * 0.55 // a card height is half of the screen width
  const cardHeaderHeight = cardHeight / 4 // a card has a total of 4 rows, and the header occupy 1 row

  const styles = StyleSheet.create({
    container: {},
    issuerLogoContainer: {
      marginBottom: 30,
    },
    cardContainer: {
      backgroundColor: display?.backgroundColor ? display.backgroundColor : transparent,
      height: cardHeight,
      borderRadius: borderRadius,
    },
    outerHeaderContainer: {
      flexDirection: 'column',
      backgroundColor: transparent,
      height: cardHeaderHeight + borderPadding,
      borderTopLeftRadius: borderRadius,
      borderTopRightRadius: borderRadius,
    },
    innerHeaderContainer: {
      flexDirection: 'row',
      height: cardHeaderHeight,
      marginLeft: borderPadding,
      marginRight: borderPadding,
      marginTop: 20,
      marginBottom: borderPadding,
      backgroundColor: transparent,
    },
    innerHeaderContainerCredLogo: {
      flex: 1,
    },
    innerHeaderCredInfoContainer: {
      flex: 3,
      alignItems: 'flex-end',
      marginRight: paddingHorizontal,
    },
    bodyContainer: {
      flexGrow: 1,
      paddingHorizontal,
      justifyContent: 'flex-end',
      paddingBottom: 10,
    },
    footerContainer: {
      flexDirection: 'row',
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      paddingHorizontal,
      paddingVertical,
      paddingLeft: paddingHorizontal + 10,
      borderBottomLeftRadius: borderRadius,
      borderBottomRightRadius: borderRadius,
    },
    revokedFooter: {
      backgroundColor: ColorPalette.notification.error,
      flexGrow: 1,
      marginHorizontal: -1 * paddingHorizontal,
      marginVertical: -1 * paddingVertical,
      paddingHorizontal: paddingHorizontal,
      paddingVertical: paddingVertical,
      borderBottomLeftRadius: borderRadius,
      borderBottomRightRadius: borderRadius,
    },
    flexGrow: {
      flexGrow: 1,
    },
    watermark: {
      opacity: 0.16,
      fontSize: 22,
      transform: [{ rotate: '-30deg' }],
    },
    credentialInfoContainer: {},
    titleFontCredentialName: {
      ...TextTheme.labelTitle,
      color: display?.textColor ?? credentialTextColor(ColorPalette, display?.backgroundColor),
      textAlignVertical: 'center',
      marginBottom: 8,
    },
    titleFontCredentialDescription: {
      ...TextTheme.label,
      color: display?.textColor ?? credentialTextColor(ColorPalette, display?.backgroundColor),
      textAlignVertical: 'center',
    },
    bodyPrimaryText: {
      ...TextTheme.normal,
      color: display?.textColor ?? credentialTextColor(ColorPalette, display?.backgroundColor),
      opacity: 0.95,
    },
    bodySecondaryText: {
      ...TextTheme.caption,
      color: display?.textColor ?? credentialTextColor(ColorPalette, display?.backgroundColor),
      opacity: 0.85,
      marginTop: 2,
    },
  })

  //This should be implimented for credential log
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const logoContaineter = (logo: DisplayImage | undefined) => {
    const width = 64
    const height = 48
    const src = logo?.url
    if (!src) {
      return <View />
    }
    if (typeof src === 'string' && src.endsWith('.svg'))
      return <SvgUri role="img" width={width} height={height} uri={src} aria-label={logo.altText} />

    return (
      <Image
        source={toImageSource(src)}
        style={{
          flex: 4,
          resizeMode: 'contain',
          width: width,
          height: height,
        }}
      />
    )
  }

  const CardHeader: React.FC = () => {
    return (
      <View style={[styles.outerHeaderContainer]}>
        <InvalidBadge isInvalid={isInvalid} />
        <View testID={testIdWithKey('CredentialCardHeader')} style={[styles.innerHeaderContainer]}>
          <View style={styles.innerHeaderContainerCredLogo}>{logoContaineter(display?.logo)}</View>
          <View style={styles.innerHeaderCredInfoContainer}>
            <View>
              <Text
                numberOfLines={1}
                ellipsizeMode="tail"
                style={styles.titleFontCredentialName}
                testID={testIdWithKey('CredentialIssuer')}
                maxFontSizeMultiplier={1}
              >
                {display?.name}
              </Text>
            </View>
            <View>
              <Text
                numberOfLines={1}
                ellipsizeMode="tail"
                style={styles.titleFontCredentialDescription}
                testID={testIdWithKey('CredentialName')}
                maxFontSizeMultiplier={1}
              >
                {display?.description}
              </Text>
            </View>
          </View>
        </View>
      </View>
    )
  }

  const CardBody: React.FC = () => {
    return (
      <View style={styles.bodyContainer} testID={testIdWithKey('CredentialCardBody')}>
        {display?.description ? (
          <Text numberOfLines={1} ellipsizeMode="tail" style={styles.bodyPrimaryText}>
            {display.description}
          </Text>
        ) : null}
        {display?.issuer?.name ? (
          <Text numberOfLines={1} ellipsizeMode="tail" style={styles.bodySecondaryText}>
            {display.issuer.name}
          </Text>
        ) : null}
      </View>
    )
  }

  const CardFooter: React.FC = () => {
    if (!overlayAttributeField) return null
    return (
      <View testID={testIdWithKey('CredentialCardFooter')} style={styles.footerContainer}>
        <Text
          style={[
            TextTheme.caption,
            {
              color: display?.textColor ?? credentialTextColor(ColorPalette, display?.backgroundColor),
            },
          ]}
          testID={testIdWithKey('CredentialIssued')}
          maxFontSizeMultiplier={1}
        >
          {overlayAttributeField.label ?? overlayAttributeField.name}: {overlayAttributeField.value}
        </Text>
      </View>
    )
  }
  const CredentialCard: React.FC = () => {
    return (
      <>
        <CardHeader />
        <CardBody />
        <CardFooter />
      </>
    )
  }

  return (
    <View>
      <TouchableOpacity
        accessible={true}
        accessibilityLabel={`${display?.issuer.name ? `${t('ListCredentials.IssuedBy')} ${display?.issuer.name}` : ''}, ${t(
          'ListCredentials.Credential'
        )}.`}
        accessibilityRole="button"
        disabled={typeof onPress === 'undefined' ? true : false}
        onPress={onPress}
        style={[styles.cardContainer, style]}
        testID={testIdWithKey('ShowCredentialDetails')}
      >
        <View style={[styles.flexGrow, { overflow: 'hidden' }]} testID={testIdWithKey('CredentialCard')}>
          {display?.backgroundImage ? (
            <ImageBackground
              source={toImageSource(display.backgroundImage.url)}
              style={styles.flexGrow}
              imageStyle={{ borderRadius }}
            >
              <CredentialCard />
            </ImageBackground>
          ) : (
            <CredentialCard />
          )}
        </View>
      </TouchableOpacity>
    </View>
  )
}

export default OpenIDCredentialCard
