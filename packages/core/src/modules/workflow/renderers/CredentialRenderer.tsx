// /**
//  * CredentialRenderer
//  *
//  * Custom renderer for displaying credentials in chat.
//  * Can render as visual cards (VDCard, TranscriptCard) or default text.
//  */
//
// import { CredentialExchangeRecord, CredentialPreviewAttribute, CredentialState } from '@credo-ts/core'
// import { useAgent } from '@credo-ts/react-hooks'
// import React, { useEffect, useState } from 'react'
// import { View, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native'
//
// import { ThemedText } from '../../../components/texts/ThemedText'
// import { useTheme } from '../../../contexts/theme'
// import { ICredentialRenderer, RenderContext } from '../types'
// import { VDCard } from './components/VDCard'
// import { TranscriptCard } from './components/TranscriptCard'
// import { TOKENS, useServices } from '../../../container-api'
//
// /**
//  * Determine credential type based on credential definition ID
//  */
// export enum CredentialDisplayType {
//   STUDENT_ID = 'student_id',
//   TRANSCRIPT = 'transcript',
//   DEFAULT = 'default',
// }
//
// /**
//  * Detect credential type from credential definition ID or attributes
//  */
// export function detectCredentialType(credential: CredentialExchangeRecord): CredentialDisplayType {
//   const credDefId = (credential as any).metadata?.data?.['_anoncreds/credential']?.credentialDefinitionId || ''
//   const credentialAttributes = credential.credentialAttributes || []
//
//   // Check for transcript attributes
//   const hasGPA = credentialAttributes.some(
//     (attr) =>
//       attr.name.toLowerCase().includes('gpa') ||
//       attr.name.toLowerCase().includes('termgpa') ||
//       attr.name.toLowerCase().includes('cumulativegpa')
//   )
//   const hasYearStart = credentialAttributes.some(
//     (attr) => attr.name.toLowerCase() === 'yearstart' || attr.name.toLowerCase() === 'year_start'
//   )
//
//   if (hasGPA || hasYearStart || credDefId.toLowerCase().includes('transcript')) {
//     return CredentialDisplayType.TRANSCRIPT
//   }
//
//   // Check for student ID attributes
//   const hasStudentId = credentialAttributes.some(
//     (attr) =>
//       attr.name.toLowerCase() === 'studentid' ||
//       attr.name.toLowerCase() === 'studentnumber' ||
//       attr.name.toLowerCase() === 'student_id'
//   )
//   const hasStudentName = credentialAttributes.some(
//     (attr) =>
//       attr.name.toLowerCase() === 'fullname' ||
//       attr.name.toLowerCase() === 'studentfullname' ||
//       attr.name.toLowerCase() === 'first' ||
//       attr.name.toLowerCase() === 'last'
//   )
//
//   if (hasStudentId && hasStudentName) {
//     return CredentialDisplayType.STUDENT_ID
//   }
//
//   // Check credDefId for known patterns
//   if (
//     credDefId.includes('NHCS') ||
//     credDefId.includes('PCS') ||
//     credDefId.includes('M-DCPS') ||
//     credDefId.includes('CFCC') ||
//     credDefId.includes('Pender') ||
//     credDefId.includes('Miami') ||
//     credDefId.includes('Hanover')
//   ) {
//     return CredentialDisplayType.STUDENT_ID
//   }
//
//   return CredentialDisplayType.DEFAULT
// }
//
// /**
//  * Props for the default credential card component
//  */
// interface CredentialCardProps {
//   credential: CredentialExchangeRecord
//   context: RenderContext
//   onPress?: () => void
//   onAccept?: () => void
//   onDecline?: () => void
// }
//
// /**
//  * Custom hook to fetch credential attributes from offer data
//  * For credentials in OfferReceived state, attributes need to be fetched from format data
//  */
// function useCredentialAttributes(credential: CredentialExchangeRecord) {
//   const { agent } = useAgent()
//   const [attributes, setAttributes] = useState<CredentialPreviewAttribute[]>(credential.credentialAttributes || [])
//   const [loading, setLoading] = useState(false)
//   const [credDefId, setCredDefId] = useState<string>(
//     (credential as any).metadata?.data?.['_anoncreds/credential']?.credentialDefinitionId || ''
//   )
//
//   useEffect(() => {
//     // If we already have attributes, use them
//     if (credential.credentialAttributes && credential.credentialAttributes.length > 0) {
//       setAttributes(credential.credentialAttributes)
//       return
//     }
//
//     // For offers without attributes, fetch from format data
//     if (agent && credential.state === CredentialState.OfferReceived) {
//       setLoading(true)
//       agent.credentials
//         .getFormatData(credential.id)
//         .then((formatData) => {
//           const { offer, offerAttributes } = formatData
//           const offerData = (offer?.anoncreds ?? offer?.indy) as { cred_def_id?: string } | undefined
//
//           // Update credDefId if available
//           if (offerData?.cred_def_id) {
//             setCredDefId(offerData.cred_def_id)
//           }
//
//           if (offerAttributes && offerAttributes.length > 0) {
//             const attrs = offerAttributes.map((item) => new CredentialPreviewAttribute(item))
//             setAttributes(attrs)
//           }
//         })
//         .catch(() => {
//           // Failed to fetch offer attributes - using fallback
//         })
//         .finally(() => {
//           setLoading(false)
//         })
//     }
//   }, [agent, credential.id, credential.state, credential.credentialAttributes])
//
//   return { attributes, loading, credDefId }
// }
//
// /**
//  * Default credential card component with optional action buttons
//  */
// export const DefaultCredentialCard: React.FC<CredentialCardProps> = ({ credential, context, onPress }) => {
//   const { SettingsTheme } = useTheme()
//   const { attributes: credentialAttributes, loading, credDefId } = useCredentialAttributes(credential)
//
//   // Extract basic credential info
//   const fullName = credentialAttributes.find(
//     (attr) => attr.name.toLowerCase() === 'fullname' || attr.name.toLowerCase() === 'studentfullname'
//   )?.value
//   const firstName = credentialAttributes.find((attr) => attr.name.toLowerCase() === 'first')?.value
//   const lastName = credentialAttributes.find((attr) => attr.name.toLowerCase() === 'last')?.value
//   const studentId = credentialAttributes.find(
//     (attr) => attr.name.toLowerCase() === 'studentid' || attr.name.toLowerCase() === 'studentnumber'
//   )?.value
//   const school = credentialAttributes.find((attr) => attr.name.toLowerCase() === 'schoolname')?.value
//
//   const displayName = fullName || (firstName && lastName ? `${firstName} ${lastName}` : '')
//
//   // Determine state label
//   const getStateLabel = () => {
//     switch (credential.state) {
//       case CredentialState.OfferReceived:
//         return context.t('CredentialOffer.CredentialOffer')
//       case CredentialState.Done:
//         return context.t('Credentials.Credential')
//       case CredentialState.Declined:
//         return context.t('CredentialOffer.Declined')
//       default:
//         return credential.state
//     }
//   }
//
//   // Get credential name from credDefId
//   const getCredentialName = () => {
//     if (!credDefId) return context.t('Credentials.Credential')
//     // Extract the last part of the credential definition ID
//     const parts = credDefId.split(':')
//     return parts[parts.length - 1] || context.t('Credentials.Credential')
//   }
//
//   // Get all credential attributes to display (excluding photos)
//   const allAttributes = credentialAttributes.filter(
//     (attr) => !['studentphoto', 'photo', 'student_photo'].includes(attr.name.toLowerCase())
//   )
//
//   const content = (
//     <View style={[styles.card, { backgroundColor: SettingsTheme.newSettingColors.bgColorUp || '#1a2634' }]}>
//       {/* Header with state */}
//       <View style={[styles.header, { backgroundColor: SettingsTheme.newSettingColors.buttonColor }]}>
//         <ThemedText style={styles.headerText}>{getStateLabel()}</ThemedText>
//       </View>
//
//       {/* Body */}
//       <View style={styles.body}>
//         {loading ? (
//           <View style={styles.loadingContainer}>
//             <ActivityIndicator size="small" color={SettingsTheme.newSettingColors.buttonColor} />
//             <ThemedText style={[styles.loadingText, { color: SettingsTheme.newSettingColors.textColor }]}>
//               {context.t('Global.Loading' as any)}
//             </ThemedText>
//           </View>
//         ) : (
//           <>
//             {/* Show credential name if we have it */}
//             <ThemedText style={[styles.credentialName, { color: SettingsTheme.newSettingColors.headerTitle }]}>
//               {getCredentialName()}
//             </ThemedText>
//
//             {/* Show school if available */}
//             {school && (
//               <ThemedText style={[styles.school, { color: SettingsTheme.newSettingColors.headerTitle }]}>
//                 {school}
//               </ThemedText>
//             )}
//
//             {/* Show display name if available */}
//             {displayName && (
//               <ThemedText style={[styles.name, { color: SettingsTheme.newSettingColors.textBody }]}>
//                 {displayName}
//               </ThemedText>
//             )}
//
//             {/* Show student ID if available */}
//             {studentId && (
//               <ThemedText style={[styles.detail, { color: SettingsTheme.newSettingColors.textColor }]}>
//                 {context.t('Chat.StudentID' as any) as string}: {studentId}
//               </ThemedText>
//             )}
//
//             {/* Show first few attributes if no specific ones found */}
//             {!school &&
//               !studentId &&
//               !displayName &&
//               allAttributes.slice(0, 4).map((attr, index) => (
//                 <ThemedText key={index} style={[styles.detail, { color: SettingsTheme.newSettingColors.textColor }]}>
//                   {attr.name && attr.value ? `${attr.name}: ${attr.value}` : ''}
//                 </ThemedText>
//               ))}
//
//             {/* Show tap to view message */}
//             {allAttributes.length > 0 && (
//               <ThemedText style={[styles.tapToView, { color: SettingsTheme.newSettingColors.textColor }]}>
//                 {context.t('Chat.TapToView' as any) || 'Tap to view details'}
//               </ThemedText>
//             )}
//           </>
//         )}
//       </View>
//
//       {/* Bottom accent line */}
//       <View style={[styles.bottomLine, { backgroundColor: SettingsTheme.newSettingColors.buttonColor }]} />
//     </View>
//   )
//
//   if (onPress) {
//     return (
//       <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
//         {content}
//       </TouchableOpacity>
//     )
//   }
//
//   return content
// }
//
// const styles = StyleSheet.create({
//   card: {
//     width: 280,
//     minHeight: 120,
//     borderRadius: 10,
//     overflow: 'hidden',
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.1,
//     shadowRadius: 4,
//     elevation: 3,
//   },
//   header: {
//     paddingVertical: 8,
//     paddingHorizontal: 12,
//   },
//   headerText: {
//     color: 'white',
//     fontSize: 12,
//     fontWeight: '600',
//   },
//   body: {
//     padding: 12,
//     flex: 1,
//   },
//   loadingContainer: {
//     alignItems: 'center',
//     justifyContent: 'center',
//     paddingVertical: 20,
//   },
//   loadingText: {
//     fontSize: 12,
//     marginTop: 8,
//   },
//   credentialName: {
//     fontSize: 14,
//     fontWeight: '700',
//     marginBottom: 8,
//   },
//   school: {
//     fontSize: 10,
//     marginBottom: 4,
//   },
//   name: {
//     fontSize: 16,
//     fontWeight: '600',
//     marginBottom: 8,
//   },
//   detail: {
//     fontSize: 12,
//     marginBottom: 2,
//   },
//   tapToView: {
//     fontSize: 10,
//     fontStyle: 'italic',
//     marginTop: 8,
//     opacity: 0.7,
//   },
//   bottomLine: {
//     height: 4,
//   },
//   vdCard: {
//     width: '100%',
//     marginTop: 20,
//     marginLeft: '5%',
//   },
// })
//
// /**
//  * Options for configuring the credential renderer
//  */
// export interface CredentialRendererOptions {
//   /** Custom card component to use instead of default */
//   CardComponent?: React.FC<CredentialCardProps>
//   /** Whether to show action buttons (accept/decline) */
//   showActions?: boolean
//   /** Callback when card is pressed */
//   onPress?: (credential: CredentialExchangeRecord, context: RenderContext) => void
//   /** Callback for accept action */
//   onAccept?: (credential: CredentialExchangeRecord, context: RenderContext) => void
//   /** Callback for decline action */
//   onDecline?: (credential: CredentialExchangeRecord, context: RenderContext) => void
// }
//
// /**
//  * Default credential renderer class
//  */
// export class DefaultCredentialRenderer implements ICredentialRenderer {
//   private options: CredentialRendererOptions
//
//   constructor(options: CredentialRendererOptions = {}) {
//     this.options = options
//   }
//
//   render(credential: CredentialExchangeRecord, context: RenderContext): React.ReactElement {
//     const handlePress = this.options.onPress ? () => this.options.onPress!(credential, context) : undefined
//     const handleAccept = this.options.onAccept ? () => this.options.onAccept!(credential, context) : undefined
//     const handleDecline = this.options.onDecline ? () => this.options.onDecline!(credential, context) : undefined
//     // const showActions = handleAccept && handleDecline && credential.state === CredentialState.OfferReceived
//
//     return (
//       <View>
//         <VDCredentialCard
//           credential={credential}
//           context={context}
//           onPress={handlePress}
//           onAccept={handleAccept}
//           onDecline={handleDecline}
//         />
//       </View>
//     )
//   }
// }
//
// /**
//  * Factory function to create a DefaultCredentialRenderer
//  */
// export function createDefaultCredentialRenderer(options: CredentialRendererOptions = {}): DefaultCredentialRenderer {
//   return new DefaultCredentialRenderer(options)
// }
//
// /**
//  * Helper function to extract credential attributes
//  */
// // eslint-disable-next-line @typescript-eslint/no-unused-vars
// function _getAttributeValue(credential: CredentialExchangeRecord, ...names: string[]): string | undefined {
//   const attrs = credential.credentialAttributes || []
//   for (const name of names) {
//     const attr = attrs.find((a) => a.name.toLowerCase() === name.toLowerCase())
//     if (attr?.value) return attr.value
//   }
//   return undefined
// }
//
// /**
//  * VD-style Credential Card Component
//  * Automatically chooses between VDCard, TranscriptCard, or Default based on credential type
//  */
// export const VDCredentialCard: React.FC<CredentialCardProps> = ({
//   credential,
//   context,
//   onPress,
//   onAccept,
//   onDecline,
// }) => {
//   const { SettingsTheme } = useTheme()
//   const { attributes, loading, credDefId } = useCredentialAttributes(credential)
//   const [CredentialButtons] = useServices([TOKENS.COMPONENT_CREDENTIAL_BUTTONS])
//
//   // Create a helper to get attribute values from the loaded attributes
//   const getAttrValue = (...names: string[]): string | undefined => {
//     for (const name of names) {
//       const attr = attributes.find((a) => a.name.toLowerCase() === name.toLowerCase())
//       if (attr?.value) return attr.value
//     }
//     return undefined
//   }
//
//   // Extract common attributes using the loaded attributes
//   const firstName = getAttrValue('first', 'firstname', 'first_name') || ''
//   const lastName = getAttrValue('last', 'lastname', 'last_name') || ''
//   const fullName = getAttrValue('fullname', 'studentfullname', 'full_name')
//   const studentId = getAttrValue('studentid', 'studentnumber', 'student_id') || ''
//   const school = getAttrValue('schoolname', 'school', 'institution')
//   const issueDate = getAttrValue('issuedate', 'issue_date', 'expirationdate', 'expiration_date') || ''
//   const studentPhoto = getAttrValue('studentphoto', 'photo', 'student_photo')
//
//   // Transcript-specific attributes
//   const yearStart = getAttrValue('yearstart', 'year_start')
//   const yearEnd = getAttrValue('yearend', 'year_end')
//   const termGPA = getAttrValue('termgpa', 'term_gpa')
//   const cumulativeGPA = getAttrValue('cumulativegpa', 'cumulative_gpa')
//
//   // Detect credential type based on loaded attributes
//   const credentialType = detectCredentialTypeFromAttributes(attributes, credDefId)
//
//   const handlePress = () => {
//     if (onPress) {
//       onPress()
//     }
//   }
//
//   // Show loading state while fetching attributes
//   if (loading) {
//     return (
//       <View style={[styles.card, { backgroundColor: SettingsTheme.newSettingColors.bgColorUp || '#1a2634' }]}>
//         <View style={[styles.header, { backgroundColor: SettingsTheme.newSettingColors.buttonColor }]}>
//           <ThemedText style={styles.headerText}>{context.t('CredentialOffer.CredentialOffer')}</ThemedText>
//         </View>
//         <View style={styles.loadingContainer}>
//           <ActivityIndicator size="small" color={SettingsTheme.newSettingColors.buttonColor} />
//         </View>
//       </View>
//     )
//   }
//
//   const renderCard = () => {
//     switch (credentialType) {
//       case CredentialDisplayType.STUDENT_ID:
//         return (
//           <VDCard
//             firstName={firstName}
//             lastName={lastName}
//             fullName={fullName}
//             studentId={studentId}
//             school={school}
//             issueDate={issueDate}
//             credDefId={credDefId}
//             issuerName={context.theirLabel}
//             isInChat={context.isInChat}
//             studentPhoto={studentPhoto}
//           />
//         )
//
//       case CredentialDisplayType.TRANSCRIPT:
//         return (
//           <TranscriptCard
//             school={school}
//             yearStart={yearStart}
//             yearEnd={yearEnd}
//             termGPA={termGPA}
//             cumulativeGPA={cumulativeGPA}
//             fullname={fullName || `${firstName} ${lastName}`}
//             isInChat={context.isInChat}
//           />
//         )
//
//       default:
//         return <DefaultCredentialCard credential={credential} context={context} />
//     }
//   }
//
//   const cardContent = renderCard()
//
//   return (
//     <View>
//       {onPress ? (
//         <TouchableOpacity onPress={handlePress} activeOpacity={0.8}>
//           {cardContent}
//         </TouchableOpacity>
//       ) : (
//         cardContent
//       )}
//
//       {/* Render action buttons if available */}
//       {credential.state === CredentialState.OfferReceived && CredentialButtons && onAccept && onDecline && (
//         <CredentialButtons isProcessing={false} onAccept={onAccept} onDecline={onDecline} />
//       )}
//     </View>
//   )
// }
//
// /**
//  * Detect credential type from attributes array (for use after async loading)
//  */
// function detectCredentialTypeFromAttributes(
//   attributes: CredentialPreviewAttribute[],
//   credDefId: string
// ): CredentialDisplayType {
//   // Check for transcript attributes
//   const hasGPA = attributes.some(
//     (attr) =>
//       attr.name.toLowerCase().includes('gpa') ||
//       attr.name.toLowerCase().includes('termgpa') ||
//       attr.name.toLowerCase().includes('cumulativegpa')
//   )
//   const hasYearStart = attributes.some(
//     (attr) => attr.name.toLowerCase() === 'yearstart' || attr.name.toLowerCase() === 'year_start'
//   )
//
//   if (hasGPA || hasYearStart || credDefId.toLowerCase().includes('transcript')) {
//     return CredentialDisplayType.TRANSCRIPT
//   }
//
//   // Check for student ID attributes
//   const hasStudentId = attributes.some(
//     (attr) =>
//       attr.name.toLowerCase() === 'studentid' ||
//       attr.name.toLowerCase() === 'studentnumber' ||
//       attr.name.toLowerCase() === 'student_id'
//   )
//   const hasStudentName = attributes.some(
//     (attr) =>
//       attr.name.toLowerCase() === 'fullname' ||
//       attr.name.toLowerCase() === 'studentfullname' ||
//       attr.name.toLowerCase() === 'first' ||
//       attr.name.toLowerCase() === 'last'
//   )
//
//   if (hasStudentId && hasStudentName) {
//     return CredentialDisplayType.STUDENT_ID
//   }
//
//   // Check credDefId for known patterns
//   if (
//     credDefId.includes('NHCS') ||
//     credDefId.includes('PCS') ||
//     credDefId.includes('M-DCPS') ||
//     credDefId.includes('CFCC') ||
//     credDefId.includes('Pender') ||
//     credDefId.includes('Miami') ||
//     credDefId.includes('Hanover')
//   ) {
//     return CredentialDisplayType.STUDENT_ID
//   }
//
//   return CredentialDisplayType.DEFAULT
// }
//
// /**
//  * Options for VD-style credential renderer
//  */
// export interface VDCredentialRendererOptions {
//   /** Callback when card is pressed */
//   onPress?: (credential: CredentialExchangeRecord, context: RenderContext) => void
//   /** Force a specific display type */
//   forceDisplayType?: CredentialDisplayType
//   /** Callback for accept action */
//   onAccept?: (credential: CredentialExchangeRecord, context: RenderContext) => void
//   /** Callback for decline action */
//   onDecline?: (credential: CredentialExchangeRecord, context: RenderContext) => void
// }
//
// /**
//  * VD-style credential renderer class
//  * Automatically displays appropriate card based on credential type
//  */
// export class VDCredentialRenderer implements ICredentialRenderer {
//   private options: VDCredentialRendererOptions
//
//   constructor(options: VDCredentialRendererOptions = {}) {
//     this.options = options
//   }
//
//   render(credential: CredentialExchangeRecord, context: RenderContext): React.ReactElement {
//     const handlePress = this.options.onPress ? () => this.options.onPress!(credential, context) : () => {}
//     const handleAccept = this.options.onAccept ? () => this.options.onAccept!(credential, context) : () => {}
//     const handleDecline = this.options.onDecline ? () => this.options.onDecline!(credential, context) : () => {}
//
//     return (
//       <View style={styles.vdCard}>
//         <VDCredentialCard
//           credential={credential}
//           context={context}
//           onPress={handlePress}
//           onAccept={handleAccept}
//           onDecline={handleDecline}
//         />
//       </View>
//     )
//   }
// }
//
// /**
//  * Factory function to create a VDCredentialRenderer
//  */
// export function createVDCredentialRenderer(options: VDCredentialRendererOptions = {}): VDCredentialRenderer {
//   return new VDCredentialRenderer(options)
// }


/**
 * CredentialRenderer
 *
 * Custom renderer for displaying credentials in chat.
 * Can render as visual cards (VDCard, TranscriptCard) or default text.
 */

import { CredentialExchangeRecord, CredentialPreviewAttribute, CredentialState } from '@credo-ts/core'
import { useAgent } from '@credo-ts/react-hooks'
import React, { useEffect, useState } from 'react'
import { View, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native'

import { ThemedText } from '../../../components/texts/ThemedText'
import { useTheme } from '../../../contexts/theme'
import { ICredentialRenderer, RenderContext } from '../types'
import { VDCard } from './components/VDCard'
import { TranscriptCard } from './components/TranscriptCard'
import { TOKENS, useServices } from '../../../container-api'

export enum CredentialDisplayType {
  STUDENT_ID = 'student_id',
  TRANSCRIPT = 'transcript',
  DEFAULT = 'default',
}

export function detectCredentialType(credential: CredentialExchangeRecord): CredentialDisplayType {
  const credDefId = (credential as any).metadata?.data?.['_anoncreds/credential']?.credentialDefinitionId || ''
  const credentialAttributes = credential.credentialAttributes || []

  const hasGPA = credentialAttributes.some(
    (attr) =>
      attr.name.toLowerCase().includes('gpa') ||
      attr.name.toLowerCase().includes('termgpa') ||
      attr.name.toLowerCase().includes('cumulativegpa')
  )
  const hasYearStart = credentialAttributes.some(
    (attr) => attr.name.toLowerCase() === 'yearstart' || attr.name.toLowerCase() === 'year_start'
  )

  if (hasGPA || hasYearStart || credDefId.toLowerCase().includes('transcript')) {
    return CredentialDisplayType.TRANSCRIPT
  }

  const hasStudentId = credentialAttributes.some(
    (attr) =>
      attr.name.toLowerCase() === 'studentid' ||
      attr.name.toLowerCase() === 'studentnumber' ||
      attr.name.toLowerCase() === 'student_id'
  )
  const hasStudentName = credentialAttributes.some(
    (attr) =>
      attr.name.toLowerCase() === 'fullname' ||
      attr.name.toLowerCase() === 'studentfullname' ||
      attr.name.toLowerCase() === 'first' ||
      attr.name.toLowerCase() === 'last'
  )

  if (hasStudentId && hasStudentName) {
    return CredentialDisplayType.STUDENT_ID
  }

  if (
    credDefId.includes('NHCS') ||
    credDefId.includes('PCS') ||
    credDefId.includes('M-DCPS') ||
    credDefId.includes('CFCC') ||
    credDefId.includes('Pender') ||
    credDefId.includes('Miami') ||
    credDefId.includes('Hanover')
  ) {
    return CredentialDisplayType.STUDENT_ID
  }

  return CredentialDisplayType.DEFAULT
}

interface CredentialCardProps {
  credential: CredentialExchangeRecord
  context: RenderContext
  onPress?: () => void
}

function useCredentialAttributes(credential: CredentialExchangeRecord) {
  const { agent } = useAgent()
  const [attributes, setAttributes] = useState<CredentialPreviewAttribute[]>(credential.credentialAttributes || [])
  const [loading, setLoading] = useState(false)
  const [credDefId, setCredDefId] = useState<string>(
    (credential as any).metadata?.data?.['_anoncreds/credential']?.credentialDefinitionId || ''
  )

  useEffect(() => {
    if (credential.credentialAttributes && credential.credentialAttributes.length > 0) {
      setAttributes(credential.credentialAttributes)
      return
    }

    if (agent && credential.state === CredentialState.OfferReceived) {
      setLoading(true)
      agent.credentials
        .getFormatData(credential.id)
        .then((formatData) => {
          const { offer, offerAttributes } = formatData
          const offerData = (offer?.anoncreds ?? offer?.indy) as { cred_def_id?: string } | undefined

          if (offerData?.cred_def_id) {
            setCredDefId(offerData.cred_def_id)
          }

          if (offerAttributes && offerAttributes.length > 0) {
            const attrs = offerAttributes.map((item) => new CredentialPreviewAttribute(item))
            setAttributes(attrs)
          }
        })
        .finally(() => {
          setLoading(false)
        })
    }
  }, [agent, credential.id, credential.state, credential.credentialAttributes])

  return { attributes, loading, credDefId }
}

export const DefaultCredentialCard: React.FC<CredentialCardProps> = ({ credential, context, onPress }) => {
  const { SettingsTheme } = useTheme()
  const { attributes: credentialAttributes, loading, credDefId } = useCredentialAttributes(credential)

  const fullName = credentialAttributes.find(
    (attr) => attr.name.toLowerCase() === 'fullname' || attr.name.toLowerCase() === 'studentfullname'
  )?.value
  const firstName = credentialAttributes.find((attr) => attr.name.toLowerCase() === 'first')?.value
  const lastName = credentialAttributes.find((attr) => attr.name.toLowerCase() === 'last')?.value
  const studentId = credentialAttributes.find(
    (attr) => attr.name.toLowerCase() === 'studentid' || attr.name.toLowerCase() === 'studentnumber'
  )?.value
  const school = credentialAttributes.find((attr) => attr.name.toLowerCase() === 'schoolname')?.value

  const displayName = fullName || (firstName && lastName ? `${firstName} ${lastName}` : '')

  const getStateLabel = () => {
    switch (credential.state) {
      case CredentialState.OfferReceived:
        return context.t('CredentialOffer.CredentialOffer')
      case CredentialState.Done:
        return context.t('Credentials.Credential')
      case CredentialState.Declined:
        return context.t('CredentialOffer.Declined')
      default:
        return credential.state
    }
  }

  const getCredentialName = () => {
    if (!credDefId) return context.t('Credentials.Credential')
    const parts = credDefId.split(':')
    return parts[parts.length - 1] || context.t('Credentials.Credential')
  }

  const allAttributes = credentialAttributes.filter(
    (attr) => !['studentphoto', 'photo', 'student_photo'].includes(attr.name.toLowerCase())
  )

  const content = (
    <View style={[styles.card, { backgroundColor: SettingsTheme.newSettingColors.bgColorUp || '#1a2634' }]}>
      <View style={[styles.header, { backgroundColor: SettingsTheme.newSettingColors.buttonColor }]}>
        <ThemedText style={styles.headerText}>{getStateLabel()}</ThemedText>
      </View>

      <View style={styles.body}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={SettingsTheme.newSettingColors.buttonColor} />
            <ThemedText style={[styles.loadingText, { color: SettingsTheme.newSettingColors.textColor }]}>
              {context.t('Global.Loading' as any)}
            </ThemedText>
          </View>
        ) : (
          <>
            <ThemedText style={[styles.credentialName, { color: SettingsTheme.newSettingColors.headerTitle }]}>
              {getCredentialName()}
            </ThemedText>

            {school && (
              <ThemedText style={[styles.school, { color: SettingsTheme.newSettingColors.headerTitle }]}>
                {school}
              </ThemedText>
            )}

            {displayName && (
              <ThemedText style={[styles.name, { color: SettingsTheme.newSettingColors.textBody }]}>
                {displayName}
              </ThemedText>
            )}

            {studentId && (
              <ThemedText style={[styles.detail, { color: SettingsTheme.newSettingColors.textColor }]}>
                {context.t('Chat.StudentID' as any) as string}: {studentId}
              </ThemedText>
            )}

            {!school &&
              !studentId &&
              !displayName &&
              allAttributes.slice(0, 4).map((attr, index) => (
                <ThemedText key={index} style={[styles.detail, { color: SettingsTheme.newSettingColors.textColor }]}>
                  {attr.name && attr.value ? `${attr.name}: ${attr.value}` : ''}
                </ThemedText>
              ))}

            {allAttributes.length > 0 && (
              <ThemedText style={[styles.tapToView, { color: SettingsTheme.newSettingColors.textColor }]}>
                {context.t('Chat.TapToView' as any) || 'Tap to view details'}
              </ThemedText>
            )}
          </>
        )}
      </View>

      <View style={[styles.bottomLine, { backgroundColor: SettingsTheme.newSettingColors.buttonColor }]} />
    </View>
  )

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        {content}
      </TouchableOpacity>
    )
  }

  return content
}

const styles = StyleSheet.create({
  card: {
    width: 280,
    minHeight: 120,
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  headerText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  body: {
    padding: 12,
    flex: 1,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    fontSize: 12,
    marginTop: 8,
  },
  credentialName: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  school: {
    fontSize: 10,
    marginBottom: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  detail: {
    fontSize: 12,
    marginBottom: 2,
  },
  tapToView: {
    fontSize: 10,
    fontStyle: 'italic',
    marginTop: 8,
    opacity: 0.7,
  },
  bottomLine: {
    height: 4,
  },
  vdCard: {
    width: '100%',
    marginTop: 20,
    marginLeft: '5%',
  },
})

export interface CredentialRendererOptions {
  CardComponent?: React.FC<CredentialCardProps>
  showActions?: boolean
  onPress?: (credential: CredentialExchangeRecord, context: RenderContext) => void
}

export class DefaultCredentialRenderer implements ICredentialRenderer {
  private options: CredentialRendererOptions

  constructor(options: CredentialRendererOptions = {}) {
    this.options = options
  }

  render(credential: CredentialExchangeRecord, context: RenderContext): React.ReactElement {
    const handlePress = this.options.onPress ? () => this.options.onPress!(credential, context) : undefined

    return (
      <View>
        <VDCredentialCard credential={credential} context={context} onPress={handlePress} />
      </View>
    )
  }
}

export function createDefaultCredentialRenderer(options: CredentialRendererOptions = {}): DefaultCredentialRenderer {
  return new DefaultCredentialRenderer(options)
}

export const VDCredentialCard: React.FC<CredentialCardProps> = ({ credential, context, onPress }) => {
  const { SettingsTheme } = useTheme()
  const { attributes, loading, credDefId } = useCredentialAttributes(credential)
  const [CredentialButtons] = useServices([TOKENS.COMPONENT_CREDENTIAL_BUTTONS])
  const { agent } = useAgent()
  const [isProcessing, setIsProcessing] = useState(false)
  const [userAction, setUserAction] = useState<'accepted' | 'declined' | null>(null)

  useEffect(() => {
    if (credential.state === CredentialState.Done) {
      setUserAction('accepted')
    } else if (credential.state === CredentialState.Declined) {
      setUserAction('declined')
    }
  }, [credential.state])

  const getAttrValue = (...names: string[]): string | undefined => {
    for (const name of names) {
      const attr = attributes.find((a) => a.name.toLowerCase() === name.toLowerCase())
      if (attr?.value) return attr.value
    }
    return undefined
  }

  const firstName = getAttrValue('first', 'firstname', 'first_name') || ''
  const lastName = getAttrValue('last', 'lastname', 'last_name') || ''
  const fullName = getAttrValue('fullname', 'studentfullname', 'full_name')
  const studentId = getAttrValue('studentid', 'studentnumber', 'student_id') || ''
  const school = getAttrValue('schoolname', 'school', 'institution')
  const issueDate = getAttrValue('issuedate', 'issue_date', 'expirationdate', 'expiration_date') || ''
  const studentPhoto = getAttrValue('studentphoto', 'photo', 'student_photo')
  const yearStart = getAttrValue('yearstart', 'year_start')
  const yearEnd = getAttrValue('yearend', 'year_end')
  const termGPA = getAttrValue('termgpa', 'term_gpa')
  const cumulativeGPA = getAttrValue('cumulativegpa', 'cumulative_gpa')

  const credentialType = detectCredentialTypeFromAttributes(attributes, credDefId)

  const handlePress = () => {
    if (onPress && userAction !== 'declined') {
      onPress()
    }
  }

  const handleAccept = async () => {
    if (!agent || isProcessing || userAction) return
    setIsProcessing(true)
    try {
      await agent.credentials.acceptOffer({ credentialRecordId: credential.id })
      setUserAction('accepted')
      if (credential.connectionId != null) {
        await agent.basicMessages.sendMessage(credential.connectionId, 'I accepted your credential offer.')
      }
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDecline = async () => {
    if (!agent || isProcessing || userAction) return
    setIsProcessing(true)
    try {
      await agent.credentials.declineOffer(credential.id)
      setUserAction('declined')
      if (credential.connectionId != null) {
        await agent.basicMessages.sendMessage(credential.connectionId, 'I declined your credential offer.')
      }
    } finally {
      setIsProcessing(false)
    }
  }

  if (loading) {
    return (
      <View style={[styles.card, { backgroundColor: SettingsTheme.newSettingColors.bgColorUp || '#1a2634' }]}>
        <View style={[styles.header, { backgroundColor: SettingsTheme.newSettingColors.buttonColor }]}>
          <ThemedText style={styles.headerText}>{context.t('CredentialOffer.CredentialOffer')}</ThemedText>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={SettingsTheme.newSettingColors.buttonColor} />
        </View>
      </View>
    )
  }

  const renderCard = () => {
    switch (credentialType) {
      case CredentialDisplayType.STUDENT_ID:
        return (
          <VDCard
            firstName={firstName}
            lastName={lastName}
            fullName={fullName}
            studentId={studentId}
            school={school}
            issueDate={issueDate}
            credDefId={credDefId}
            issuerName={context.theirLabel}
            isInChat={context.isInChat}
            studentPhoto={studentPhoto}
          />
        )

      case CredentialDisplayType.TRANSCRIPT:
        return (
          <TranscriptCard
            school={school}
            yearStart={yearStart}
            yearEnd={yearEnd}
            termGPA={termGPA}
            cumulativeGPA={cumulativeGPA}
            fullname={fullName || `${firstName} ${lastName}`}
            isInChat={context.isInChat}
          />
        )

      default:
        return <DefaultCredentialCard credential={credential} context={context} onPress={onPress} />
    }
  }

  const cardContent = renderCard()
  const showButtons = credential.state === CredentialState.OfferReceived && !userAction

  return (
    <View>
      <View style={{ opacity: userAction === 'declined' ? 0.5 : 1 }}>
        {onPress && userAction !== 'declined' ? (
          <TouchableOpacity onPress={handlePress} activeOpacity={0.8}>
            {cardContent}
          </TouchableOpacity>
        ) : (
          <View>{cardContent}</View>
        )}
      </View>

      {showButtons && CredentialButtons && (
        <CredentialButtons
          isProcessing={isProcessing}
          onAccept={handleAccept}
          onDecline={handleDecline}
        />
      )}
    </View>
  )
}

function detectCredentialTypeFromAttributes(
  attributes: CredentialPreviewAttribute[],
  credDefId: string
): CredentialDisplayType {
  const hasGPA = attributes.some(
    (attr) =>
      attr.name.toLowerCase().includes('gpa') ||
      attr.name.toLowerCase().includes('termgpa') ||
      attr.name.toLowerCase().includes('cumulativegpa')
  )
  const hasYearStart = attributes.some(
    (attr) => attr.name.toLowerCase() === 'yearstart' || attr.name.toLowerCase() === 'year_start'
  )

  if (hasGPA || hasYearStart || credDefId.toLowerCase().includes('transcript')) {
    return CredentialDisplayType.TRANSCRIPT
  }

  const hasStudentId = attributes.some(
    (attr) =>
      attr.name.toLowerCase() === 'studentid' ||
      attr.name.toLowerCase() === 'studentnumber' ||
      attr.name.toLowerCase() === 'student_id'
  )
  const hasStudentName = attributes.some(
    (attr) =>
      attr.name.toLowerCase() === 'fullname' ||
      attr.name.toLowerCase() === 'studentfullname' ||
      attr.name.toLowerCase() === 'first' ||
      attr.name.toLowerCase() === 'last'
  )

  if (hasStudentId && hasStudentName) {
    return CredentialDisplayType.STUDENT_ID
  }

  if (
    credDefId.includes('NHCS') ||
    credDefId.includes('PCS') ||
    credDefId.includes('M-DCPS') ||
    credDefId.includes('CFCC') ||
    credDefId.includes('Pender') ||
    credDefId.includes('Miami') ||
    credDefId.includes('Hanover')
  ) {
    return CredentialDisplayType.STUDENT_ID
  }

  return CredentialDisplayType.DEFAULT
}

export interface VDCredentialRendererOptions {
  onPress?: (credential: CredentialExchangeRecord, context: RenderContext) => void
  forceDisplayType?: CredentialDisplayType
}

export class VDCredentialRenderer implements ICredentialRenderer {
  private options: VDCredentialRendererOptions

  constructor(options: VDCredentialRendererOptions = {}) {
    this.options = options
  }

  render(credential: CredentialExchangeRecord, context: RenderContext): React.ReactElement {
    const handlePress = this.options.onPress ? () => this.options.onPress!(credential, context) : () => {}

    return (
      <View style={styles.vdCard}>
        <VDCredentialCard credential={credential} context={context} onPress={handlePress} />
      </View>
    )
  }
}

export function createVDCredentialRenderer(options: VDCredentialRendererOptions = {}): VDCredentialRenderer {
  return new VDCredentialRenderer(options)
}
