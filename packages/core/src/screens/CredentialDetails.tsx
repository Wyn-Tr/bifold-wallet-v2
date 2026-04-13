import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  Pressable,
  Dimensions, Platform,
} from 'react-native'
import { CommonActions, RouteProp, useNavigation, useRoute } from '@react-navigation/native'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import { CredentialExchangeRecord, CredentialPreviewAttribute } from '@credo-ts/core'
import { AnonCredsCredentialMetadataKey } from '@credo-ts/anoncreds'
import { useAgent } from '@credo-ts/react-hooks'
import { NativeStackNavigationProp } from 'react-native-screens/lib/typescript/native-stack'
import { VDCard } from '../modules/workflow/renderers/components/VDCard'
import { TranscriptCard } from '../modules/workflow/renderers/components/TranscriptCard'
import { TOKENS, useServices } from '../container-api'
import { ColorPalette } from '../theme'
import { CredentialSVGRenderer, isSchemaSupported } from '../modules/credential-svg'
import QRCode from 'react-native-qrcode-svg'
import CloseIcon from '../assets/icons/CloseIcon.svg'
import { useTranslation } from 'react-i18next'
import { Screens, Stacks } from '../types/navigators'

type RootStackParamList = {
  CredentialDetails: {
    credential?: CredentialExchangeRecord
    credentialId?: string
    logoUrl?: string
    cardColor: string
    credentialType?: 'STUDENT_ID' | 'TRANSCRIPT' | 'DEFAULT'
  }
}

type CredentialDetailsRouteProp = RouteProp<RootStackParamList, 'CredentialDetails'>
type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'CredentialDetails'>

type CredentialDetailsProps = {
  navigation?: NavigationProp
  route?: CredentialDetailsRouteProp
}

const useCredentialData = (routeCredential?: CredentialExchangeRecord, credentialId?: string) => {
  const { agent } = useAgent()
  const [credential, setCredential] = useState<CredentialExchangeRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [attributes, setAttributes] = useState<CredentialPreviewAttribute[]>([])
  const [credDefId, setCredDefId] = useState<string>('')
  const [schemaId, setSchemaId] = useState<string>('')

  useEffect(() => {
    const fetchData = async () => {
      if (!agent) {
        setLoading(false)
        return
      }

      try {
        let credRecord = routeCredential

        if (!credRecord && credentialId) {
          const allCredentials = await agent.credentials.getAll()
          credRecord = allCredentials.find((cred) => cred.id === credentialId)
        }

        if (!credRecord) {
          setLoading(false)
          return
        }

        setCredential(credRecord)

        const metadata = credRecord.metadata.get(AnonCredsCredentialMetadataKey)
        const defId = metadata?.credentialDefinitionId || ''
        const sId = metadata?.schemaId || ''
        setCredDefId(defId)
        setSchemaId(sId)

        if (credRecord.credentialAttributes && credRecord.credentialAttributes.length > 0) {
          setAttributes(credRecord.credentialAttributes)
        } else {
          try {
            const formatData = await agent.credentials.getFormatData(credRecord.id)
            const { offerAttributes } = formatData
            if (offerAttributes && offerAttributes.length > 0) {
              const attrs = offerAttributes.map((item) => new CredentialPreviewAttribute(item))
              setAttributes(attrs)
            }
          } catch (error) {
            // console.error('Failed to fetch offer attributes:', error)
          }
        }
      } catch (error) {
        // console.error('Failed to load credential data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [agent, routeCredential, credentialId])

  return { credential, loading, attributes, credDefId, schemaId }
}

const parseTranscriptData = (attributes: CredentialPreviewAttribute[]) => {
  const transcriptAttr = attributes.find((attr) => attr.name.toLowerCase() === 'transcript')
  const studentInfoAttr = attributes.find((attr) => attr.name.toLowerCase() === 'studentinfo')
  const termsAttr = attributes.find((attr) => attr.name.toLowerCase() === 'terms')

  let transcriptData = {}
  let studentInfoData = {}
  let termsData: any[] = []

  try {
    if (transcriptAttr?.value) transcriptData = JSON.parse(transcriptAttr.value)
    if (studentInfoAttr?.value) studentInfoData = JSON.parse(studentInfoAttr.value)
    if (termsAttr?.value) termsData = JSON.parse(termsAttr.value)
  } catch (e) {
    // console.error('Failed to parse transcript JSON:', e)
  }

  let yearStart = ''
  let yearEnd = ''
  let termGPA = ''

  if (termsData.length > 0) {
    const firstTerm = termsData[0]
    const lastTerm = termsData[termsData.length - 1]

    if (firstTerm.termYear) {
      const years = firstTerm.termYear.split('-')
      if (years.length >= 2) {
        yearStart = years[0]
      }
    }

    if (lastTerm.termYear) {
      const years = lastTerm.termYear.split('-')
      if (years.length >= 2) {
        yearEnd = years[1]
      }
    }

    if (termsData.length > 0) {
      const latestTerm = termsData[termsData.length - 1]
      termGPA = latestTerm.termGpa || ''
    }
  }

  return {
    transcript: transcriptData,
    studentInfo: studentInfoData,
    terms: termsData,
    yearStart,
    yearEnd,
    termGPA,
  }
}

const getAttrValue = (attributes: CredentialPreviewAttribute[], ...names: string[]): string | undefined => {
  if (!attributes || attributes.length === 0) return undefined

  for (const name of names) {
    const attr = attributes.find((a) => a.name && a.name.toLowerCase() === name.toLowerCase())
    if (attr?.value) return attr.value
  }
  return undefined
}

const CredentialDetails: React.FC<CredentialDetailsProps> = () => {
  const { t } = useTranslation()
  const navigation = useNavigation<NavigationProp>()
  const route = useRoute<CredentialDetailsRouteProp>()
  const { agent } = useAgent()
  const { credential: routeCredential, credentialId, credentialType } = route.params || {}
  const [GradientBackground] = useServices([TOKENS.COMPONENT_GRADIENT_BACKGROUND])
  const { credential, loading, attributes, credDefId, schemaId } = useCredentialData(routeCredential, credentialId)

  const [isOverflowOpen, setIsOverflowOpen] = useState(false)
  const [overflowAnchor, setOverflowAnchor] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const [showRemoveModal, setShowRemoveModal] = useState(false)
  const [showZoomModal, setShowZoomModal] = useState(false)
  const windowWidth = Dimensions.get('window').width
  const [ZoomableView] = useServices([TOKENS.COMPONENT_ZOOMABLE_VIEW])


  useEffect(() => {
    if (typeof navigation.setOptions === 'function') {
      navigation.setOptions({
        headerShown: false,
      } as any)
    }
  }, [navigation])

  const closeOverflowMenu = useCallback(() => {
    setIsOverflowOpen(false)
  }, [])

  const openOverflowMenuAtEvent = useCallback(
    (e?: any) => {
      if (e?.nativeEvent) {
        const { pageX, pageY } = e.nativeEvent
        const w = 40
        const h = 40

        setOverflowAnchor({
          x: pageX - 20,
          y: pageY - (Platform.OS === 'ios' ? -20 : 20),
          w,
          h,
        })
      } else {
        setOverflowAnchor({
          x: windowWidth - 48,
          y: 100,
          w: 40,
          h: 40,
        })
      }
      setIsOverflowOpen(true)
    },
    [windowWidth]
  )

  const onGoToChannel = useCallback(() => {
    closeOverflowMenu()
    if (credential?.connectionId) {
      navigation.dispatch(
        CommonActions.navigate({
          name: Stacks.ContactStack,
          params: {
            screen: Screens.Chat,
            params: { connectionId: credential.connectionId },
          },
        })
      )
    }
  }, [closeOverflowMenu, navigation, credential])

  const onRemoveCredential = useCallback(() => {
    closeOverflowMenu()
    setShowRemoveModal(true)
  }, [closeOverflowMenu])

  const confirmRemoveCredential = useCallback(async () => {
    if (agent && credential?.id) {
      try {
        await agent.credentials.deleteById(credential.id)
      } catch (error) {
        // console.error('Failed to delete credential:', error)
      }
    }
    setShowRemoveModal(false)
    navigation.goBack()
  }, [agent, credential, navigation])

  const cancelRemoveCredential = useCallback(() => {
    setShowRemoveModal(false)
  }, [])

  const handleZoomIn = useCallback(() => {
    setShowZoomModal(true)
  }, [])

  const handleZoomOut = useCallback(() => {
    setShowZoomModal(false)
  }, [])

  if (loading) {
    return (
      <GradientBackground>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#016C72" />
          </View>
        </SafeAreaView>
      </GradientBackground>
    )
  }

  if (!credential) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.errorContainer}>
          <Icon name="alert-circle" size={64} color="#FF3B30" />
          <Text style={styles.errorText}>{t('CredentialDetails.CredentialNotFound')}</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Icon name="arrow-left" size={24} color="#000" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  const firstName = getAttrValue(attributes, 'first', 'firstname', 'first_name') || ''
  const lastName = getAttrValue(attributes, 'last', 'lastname', 'last_name') || ''
  const fullName =
    getAttrValue(attributes, 'fullname', 'studentfullname', 'full_name', 'name') ||
    `${firstName} ${lastName}`.trim() ||
    // For generic credentials, use the first non-empty attribute value as display name
    (attributes.length > 0 ? attributes[0]?.value || '' : '') ||
    t('CredentialDetails.DefaultName')
  const studentId = getAttrValue(attributes, 'studentid', 'studentnumber', 'student_id', 'idnumber', 'id_number') || ''
  const school = getAttrValue(attributes, 'schoolname', 'school', 'institution') || ''
  const rawIssueDate = getAttrValue(attributes, 'issuedate', 'issue_date')

  // Detect if this is a known schema type or a generic credential
  const isKnownSchema = !!(firstName || lastName || school ||
    getAttrValue(attributes, 'fullname', 'studentfullname', 'full_name') ||
    (schemaId && isSchemaSupported(schemaId)))
  // For generic credentials, collect all attributes for display
  const genericAttributes = !isKnownSchema ? attributes.filter((a) => a.name && a.value) : []
  // Resolve a meaningful credential name from schema or cred_def
  const credentialTitle = (() => {
    if (schemaId) {
      try {
        const parts = schemaId.split(':')
        // Indy schema format: did:2:name:version
        if (parts.length >= 4) return parts[parts.length - 2]
      } catch { /* ignore */ }
    }
    if (credDefId) {
      const tag = credDefId.split(':').pop()
      if (tag && tag.toLowerCase() !== 'default') return tag
    }
    return ''
  })()

  const formatDate = (dateStr: string | undefined): string => {
    if (!dateStr) {
      const date = credential?.createdAt ? new Date(credential.createdAt) : new Date()
      return date.toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
      })
    }

    if (dateStr.length === 8 && /^\d{8}$/.test(dateStr)) {
      const year = dateStr.substring(0, 4)
      const month = dateStr.substring(4, 6)
      const day = dateStr.substring(6, 8)
      return `${month}/${day}/${year}`
    }

    try {
      const date = new Date(dateStr)
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('en-US', {
          month: '2-digit',
          day: '2-digit',
          year: 'numeric',
        })
      }
    } catch (e) {
      // console.error('Date parsing failed:', e)
    }

    return dateStr
  }

  const formatExpirationDate = (): string => {
    const issuedDate = rawIssueDate ? new Date(formatDate(rawIssueDate)) : new Date(credential?.createdAt || Date.now())

    const expirationAttr = getAttrValue(attributes, 'expirationdate', 'expiration_date', 'expiration')
    if (expirationAttr) {
      return formatDate(expirationAttr)
    }

    const noExpirationAttr = getAttrValue(attributes, 'noexpiration', 'no_expiration', 'expires', 'validity')
    if (noExpirationAttr) {
      const lowerAttr = noExpirationAttr.toLowerCase()
      if (
        lowerAttr === 'never' ||
        lowerAttr === 'false' ||
        lowerAttr === 'no' ||
        lowerAttr === 'permanent' ||
        lowerAttr === 'indefinite' ||
        lowerAttr === 'none'
      ) {
        return t('CredentialDetails.NoExpiration')
      }
    }

    // If no expiration field exists in attributes at all
    const hasExpirationField = attributes.some((attr) =>
      [
        'expirationdate',
        'expiration_date',
        'expiration',
        'noexpiration',
        'no_expiration',
        'expires',
        'validity',
      ].includes(attr.name.toLowerCase())
    )

    if (!hasExpirationField) {
      return t('CredentialDetails.NoExpiration')
    }

    const expirationDate = new Date(issuedDate)
    expirationDate.setFullYear(expirationDate.getFullYear() + 5)
    return expirationDate.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
    })
  }

  const issuedDate = formatDate(rawIssueDate)
  const expirationDate = formatExpirationDate()

  const isTranscript = credentialType === 'TRANSCRIPT' || (credDefId && credDefId.includes('Transcript'))
  const displayName =
    isTranscript && credDefId
      ? credDefId.split(':').pop()?.replace(' Transcript', '') || school || t('CredentialDetails.Transcript')
      : school || credentialTitle || t('CredentialDetails.StudentCard')

  const transcriptData = parseTranscriptData(attributes)
  const yearStart = getAttrValue(attributes, 'yearstart', 'year_start') || transcriptData.yearStart
  const yearEnd = getAttrValue(attributes, 'yearend', 'year_end') || transcriptData.yearEnd
  const termGPA = getAttrValue(attributes, 'termgpa', 'term_gpa') || transcriptData.termGPA
  const cumulativeGPA = getAttrValue(attributes, 'cumulativegpa', 'cumulative_gpa')
  const gpa = getAttrValue(attributes, 'gpa') || (transcriptData.transcript as any)?.gpa

  const qrData = studentId || credential.id

  const renderCredentialCard = () => {
    const issuerName = credential.connectionId || t('CredentialDetails.Issuer')

    // Use new SVG renderer for supported schemas
    if (schemaId && isSchemaSupported(schemaId)) {
      return (
        <TouchableOpacity onPress={handleZoomIn} activeOpacity={0.8}>
          <CredentialSVGRenderer
            schemaId={schemaId}
            credDefId={credDefId}
            attributes={attributes}
            mode="full"
            isInChat={false}
            width={320}
          />
        </TouchableOpacity>
      )
    }

    // Fall back to existing card components for unsupported schemas
    if (isTranscript) {
      const displayFullName =
        fullName || (transcriptData.studentInfo as any)?.studentFullName || `${firstName} ${lastName}`
      const displaySchool = school || (transcriptData.studentInfo as any)?.schoolName
      const displayGPA = cumulativeGPA || termGPA || gpa
      const displayYearStart = yearStart || transcriptData.yearStart
      const displayYearEnd = yearEnd || transcriptData.yearEnd
      const displayTermGPA = termGPA || transcriptData.termGPA

      return (
        <TouchableOpacity onPress={handleZoomIn} activeOpacity={0.8}>
          <TranscriptCard
            school={displaySchool}
            yearStart={displayYearStart}
            yearEnd={displayYearEnd}
            termGPA={displayTermGPA}
            cumulativeGPA={displayGPA}
            fullname={displayFullName}
            isInChat={false}
          />
        </TouchableOpacity>
      )
    } else {
      const studentPhoto = getAttrValue(attributes, 'studentphoto', 'photo', 'student_photo')

      return (
        <TouchableOpacity onPress={handleZoomIn} activeOpacity={0.8}>
          <VDCard
            firstName={firstName}
            lastName={lastName}
            fullName={fullName}
            studentId={studentId}
            school={school || displayName}
            issueDate={issuedDate}
            credDefId={credDefId}
            issuerName={issuerName}
            isInChat={false}
            studentPhoto={studentPhoto}
          />
        </TouchableOpacity>
      )
    }
  }

  const renderZoomedContent = () => {
    const issuerName = credential.connectionId || t('CredentialDetails.Issuer')

    // Use new SVG renderer for supported schemas
    if (schemaId && isSchemaSupported(schemaId)) {
      return (
        <CredentialSVGRenderer
          schemaId={schemaId}
          credDefId={credDefId}
          attributes={attributes}
          mode="full"
          isInChat={false}
          width={Dimensions.get('window').width * 0.9}
        />
      )
    }

    // Fall back to existing card components for unsupported schemas
    if (isTranscript) {
      const displayFullName =
        fullName || (transcriptData.studentInfo as any)?.studentFullName || `${firstName} ${lastName}`
      const displaySchool = school || (transcriptData.studentInfo as any)?.schoolName
      const displayGPA = cumulativeGPA || termGPA || gpa
      const displayYearStart = yearStart || transcriptData.yearStart
      const displayYearEnd = yearEnd || transcriptData.yearEnd
      const displayTermGPA = termGPA || transcriptData.termGPA

      return (
        <TranscriptCard
          school={displaySchool}
          yearStart={displayYearStart}
          yearEnd={displayYearEnd}
          termGPA={displayTermGPA}
          cumulativeGPA={displayGPA}
          fullname={displayFullName}
          isInChat={false}
        />
      )
    } else {
      const studentPhoto = getAttrValue(attributes, 'studentphoto', 'photo', 'student_photo')

      return (
        <VDCard
          firstName={firstName}
          lastName={lastName}
          fullName={fullName}
          studentId={studentId}
          school={school || displayName}
          issueDate={issuedDate}
          credDefId={credDefId}
          issuerName={issuerName}
          isInChat={false}
          studentPhoto={studentPhoto}
        />
      )
    }
  }

  const menuStyle = {
    position: 'absolute' as const,
    top: overflowAnchor?.y || 100,
    right: overflowAnchor ? windowWidth - overflowAnchor.x - 40 : 8,
  }

  const overflowMenu = (
    <Modal visible={isOverflowOpen} transparent animationType="fade" onRequestClose={closeOverflowMenu}>
      <Pressable style={{ flex: 1 }} onPress={closeOverflowMenu}>
        <View style={[menuStyle]}>
          <View
            style={{
              backgroundColor: '#1F1F1F',
              borderRadius: 12,
              paddingVertical: 8,
              minWidth: 160,
              shadowOpacity: 0.25,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 6 },
              elevation: 8,
            }}
          >
            <Pressable
              onPress={onGoToChannel}
              accessibilityRole="button"
              accessibilityLabel={t('CredentialDetails.GoToChannel')}
              style={({ pressed }) => ({
                paddingHorizontal: 16,
                paddingVertical: 12,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 16 }}>{t('CredentialDetails.GoToChannel')}</Text>
            </Pressable>

            <Pressable
              onPress={onRemoveCredential}
              accessibilityRole="button"
              accessibilityLabel={t('CredentialDetails.RemoveCredential')}
              style={({ pressed }) => ({
                paddingHorizontal: 16,
                paddingVertical: 12,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 16 }}>{t('CredentialDetails.RemoveCredential')}</Text>
            </Pressable>
          </View>
        </View>
      </Pressable>
    </Modal>
  )

  const removeCredentialModal = (
    <Modal visible={showRemoveModal} transparent animationType="fade" onRequestClose={cancelRemoveCredential}>
      <Pressable style={styles.removeModalBackdrop} onPress={cancelRemoveCredential}>
        <View style={styles.removeModalContainer}>
          <View style={styles.removeModalCard}>
            <CloseIcon color="#FF4445" />
            <Text style={styles.removeModalTitle}>{t('CredentialDetails.RemoveCredential')}</Text>
            <Text style={styles.removeModalMessage}>{t('CredentialDetails.RemoveCredentialConfirm')}</Text>
            <View style={styles.removeModalButtons}>
              <TouchableOpacity style={styles.removeModalCancelButton} onPress={cancelRemoveCredential}>
                <Text style={styles.removeModalCancelButtonText}>{t('CredentialDetails.Back')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.removeModalConfirmButton} onPress={confirmRemoveCredential}>
                <Text style={styles.removeModalConfirmButtonText}>{t('CredentialDetails.RemoveCredentialAction')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Pressable>
    </Modal>
  )

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safeArea}>
        {overflowMenu}
        {removeCredentialModal}

        {showZoomModal && (
          <ZoomableView isVisible={showZoomModal} onClose={handleZoomOut}>
            {renderZoomedContent()}
          </ZoomableView>
        )}

        <View style={styles.headerContainer}>
          <View style={styles.navBar}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <Icon name="chevron-left" size={40} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.spacer} />
            <TouchableOpacity style={styles.menuButton} onPress={openOverflowMenuAtEvent}>
              <Icon name="dots-horizontal-circle-outline" size={40} color={isOverflowOpen ? '#6666CC' : '#FFFFFF'} />
            </TouchableOpacity>
          </View>
        </View>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.cardSection}>
            <View style={styles.cardContainer}>{renderCredentialCard()}</View>
            <View style={styles.smallDivider} />
          </View>

          {/* Inline QR Code Section - Only show for Student ID, not Transcript */}
          {!isTranscript && (
            <View style={styles.qrSection}>
              <View style={styles.qrCard}>
                <QRCode
                  value={qrData}
                  size={180}
                  color="#FFFFFF"
                  backgroundColor="transparent"
                />
              </View>
              <Text style={styles.qrSectionName}>{fullName}</Text>
              <Text style={styles.qrSectionInfo}>{school || credentialTitle || displayName}</Text>
            </View>
          )}

          <View style={styles.detailsSection}>
            <Text style={styles.schoolName}>{displayName}</Text>
            <Text style={styles.studentCardLabel}>
              {isTranscript ? t('CredentialDetails.Transcript') : (credentialTitle || t('CredentialDetails.StudentCard'))}
            </Text>
            {genericAttributes.length > 0 ? (
              <>
                {genericAttributes.map((attr, index) => (
                  <View key={index} style={{ marginBottom: 8 }}>
                    <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, marginBottom: 2 }}>
                      {attr.name}
                    </Text>
                    <Text style={{ color: '#FFFFFF', fontSize: 17, fontWeight: '600' }}>
                      {attr.value}
                    </Text>
                  </View>
                ))}
              </>
            ) : (
              <Text style={styles.studentName}>{fullName}</Text>
            )}
            <View style={styles.dateContainer}>
              <View style={styles.dateBox}>
                <Text style={styles.dateLabel}>{t('CredentialDetails.IssuedOn')}</Text>
                <Text style={styles.dateValue}>{issuedDate}</Text>
              </View>
              <View style={styles.dividerLine} />
              <View style={styles.dateBox}>
                <Text style={styles.dateLabel}>{t('CredentialDetails.ExpirationDate')}</Text>
                <Text style={styles.dateValue}>{expirationDate}</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  headerContainer: {
    paddingTop: Platform.OS === 'ios' ? 0 : 10,
    marginTop: Platform.OS === 'ios' ? -20 : 0,
    paddingBottom: 5,
  },
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 50,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  spacer: {
    flex: 1,
  },
  menuButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 40,
  },
  cardSection: {
    alignItems: 'center',
    marginBottom: 10,
  },
  cardContainer: {
    flex: 1,
    width: '95%',
    borderRadius: 16,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallDivider: {
    width: 40,
    height: 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 1,
    marginTop: 15,
    alignSelf: 'center',
  },
  detailsSection: {
    marginBottom: 20,
  },
  schoolName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'OpenSans-SemiBold',
    textAlign: 'center',
    marginBottom: 2,
  },
  studentCardLabel: {
    fontSize: 16,
    color: '#FFFFFF',
    fontFamily: 'OpenSans-Regular',
    textAlign: 'center',
    marginBottom: 15,
  },
  studentName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: 'OpenSans-Bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  dateContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: ColorPalette.grayscale.digicredBackgroundModal,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  dateBox: {
    flex: 1,
    alignItems: 'center',
  },
  dateLabel: {
    fontSize: 14,
    color: '#FFFFFF',
    fontFamily: 'OpenSans-Medium',
    marginBottom: 4,
  },
  dateValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'OpenSans-SemiBold',
  },
  dividerLine: {
    width: 1,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FF3B30',
    marginTop: 16,
    fontFamily: 'OpenSans-SemiBold',
  },
  qrCard: {
    backgroundColor: ColorPalette.grayscale.digicredBackgroundModal,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    borderWidth: 1.5,
    borderColor: '#004D4D',
  },
  qrSection: {
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  qrSectionName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    fontFamily: 'OpenSans-SemiBold',
    marginTop: 16,
  },
  qrSectionInfo: {
    fontSize: 14,
    color: '#AAAAAA',
    textAlign: 'center',
    fontFamily: 'OpenSans-Regular',
    marginTop: 4,
  },
  removeModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeModalContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  removeModalCard: {
    width: '95%',
    padding: 32,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 32,
    borderRadius: 16,
    backgroundColor: '#25272A',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 4 },
    shadowOpacity: 0.48,
    shadowRadius: 12,
    elevation: 12,
  },
  removeModalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    fontFamily: 'OpenSans-SemiBold',
  },
  removeModalMessage: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 22,
    fontFamily: 'OpenSans-Regular',
  },
  removeModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 8,
  },
  removeModalCancelButton: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    borderRadius: 25,
    paddingVertical: 12,
    alignItems: 'center',
  },
  removeModalCancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'OpenSans-SemiBold',
  },
  removeModalConfirmButton: {
    flex: 2,
    backgroundColor: '#FF4445',
    borderRadius: 25,
    paddingVertical: 12,
    alignItems: 'center',
  },
  removeModalConfirmButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'OpenSans-SemiBold',
  },
})

export default CredentialDetails