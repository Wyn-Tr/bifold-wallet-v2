import { useAgent } from '@credo-ts/react-hooks'
import { StackScreenProps } from '@react-navigation/stack'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  DeviceEventEmitter,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import LinearGradient from 'react-native-linear-gradient'
import { SafeAreaView } from 'react-native-safe-area-context'

import { MdocRecord, SdJwtVcRecord, W3cCredentialRecord } from '@credo-ts/core'
import { OpenBadgeCredentialRecord } from '@ajna-inc/openbadges'
import { JsonLdCredentialRecord } from '../jsonLd/JsonLdCredentialRecord'

import OpenIDUnsatisfiedProofRequest from '../components/OpenIDUnsatisfiedProofRequest'
import CommonRemoveModal from '../../../components/modals/CommonRemoveModal'
import { EventTypes } from '../../../constants'
import ScreenLayout from '../../../layout/ScreenLayout'
import { OpenIDProofSuccessScreen } from './proof/OpenIDProofSuccessScreen'
import { BifoldError } from '../../../types/error'
import { DeliveryStackParams, Screens, Stacks, TabStacks } from '../../../types/navigators'
import { ModalUsage } from '../../../types/remove'
import { testIdWithKey } from '../../../utils/testable'
import { useOpenIDCredentials } from '../context/OpenIDCredentialRecordProvider'
import { getCredentialForDisplay } from '../display'
import {
  DC_PALETTE,
  DCActionRow,
  DCAttrList,
  DCCredentialMark,
  DCIcon,
  resolveDesign,
  expandObject,
  type DCAttrItem,
} from '../../openid-card-design'
import {
  formatDifPexCredentialsForRequest,
  FormattedSelectedCredentialEntry,
  FormattedSubmissionEntry,
} from '../displayProof'
import { shareProof } from '../resolverProof'
import { isMdocProofRequest, isSdJwtProofRequest, isW3CProofRequest } from '../utils/utils'

type OpenIDProofPresentationProps = StackScreenProps<DeliveryStackParams, Screens.OpenIDProofPresentation>

type SatisfiedCredentialsFormat = {
  [inputDescriptorId: string]: { id: string; claimFormat: string }[]
}
type SelectedCredentialsFormat = {
  [inputDescriptorId: string]: { id: string; claimFormat: string }
}

type WalletRecord =
  | W3cCredentialRecord
  | SdJwtVcRecord
  | MdocRecord
  | OpenBadgeCredentialRecord
  | JsonLdCredentialRecord

const OpenIDProofPresentation: React.FC<OpenIDProofPresentationProps> = ({
  navigation,
  route: {
    params: { credential },
  },
}) => {
  const [declineModalVisible, setDeclineModalVisible] = useState(false)
  const [buttonsVisible, setButtonsVisible] = useState(true)
  const [acceptModalVisible, setAcceptModalVisible] = useState(false)
  const [shareInFlight, setShareInFlight] = useState(false)
  const [credentialsRequested, setCredentialsRequested] = useState<WalletRecord[]>([])
  const [satistfiedCredentialsSubmission, setSatistfiedCredentialsSubmission] =
    useState<SatisfiedCredentialsFormat>()
  const [selectedCredentialsSubmission, setSelectedCredentialsSubmission] =
    useState<SelectedCredentialsFormat>()

  const {
    getW3CCredentialById,
    getSdJwtCredentialById,
    getMdocCredentialById,
    getOpenBadgeCredentialById,
    getJsonLdCredentialById,
  } = useOpenIDCredentials()

  const { t } = useTranslation()
  const { agent } = useAgent()

  const toggleDeclineModalVisible = () => setDeclineModalVisible((v) => !v)

  const submission = useMemo(
    () =>
      credential && credential.credentialsForRequest
        ? formatDifPexCredentialsForRequest(credential.credentialsForRequest)
        : undefined,
    [credential]
  )

  useEffect(() => {
    if (!submission) return
    const creds = submission.entries.reduce((acc: SatisfiedCredentialsFormat, entry) => {
      acc[entry.inputDescriptorId] = entry.credentials.map((c) => ({ id: c.id, claimFormat: c.claimFormat }))
      return acc
    }, {})
    setSatistfiedCredentialsSubmission(creds)
  }, [submission])

  useEffect(() => {
    async function fetchCreds() {
      if (!satistfiedCredentialsSubmission) return
      const creds: WalletRecord[] = []
      for (const [inputDescriptorID, credIDs] of Object.entries(satistfiedCredentialsSubmission)) {
        for (const { id, claimFormat } of credIDs) {
          let rec: WalletRecord | undefined
          if (isW3CProofRequest(claimFormat)) {
            const w3c = await getW3CCredentialById(id).catch(() => undefined)
            const jsonLd = w3c ? undefined : await getJsonLdCredentialById(id).catch(() => undefined)
            const openBadge = w3c || jsonLd ? undefined : await getOpenBadgeCredentialById(id).catch(() => undefined)
            rec = w3c ?? jsonLd ?? openBadge
          } else if (isSdJwtProofRequest(claimFormat)) {
            rec = await getSdJwtCredentialById(id)
          } else if (isMdocProofRequest(claimFormat)) {
            rec = await getMdocCredentialById(id)
          }
          if (rec && inputDescriptorID) creds.push(rec)
        }
      }
      setCredentialsRequested(creds)
    }
    fetchCreds()
  }, [
    satistfiedCredentialsSubmission,
    getW3CCredentialById,
    getSdJwtCredentialById,
    getMdocCredentialById,
    getOpenBadgeCredentialById,
    getJsonLdCredentialById,
  ])

  useEffect(() => {
    if (!satistfiedCredentialsSubmission || credentialsRequested.length <= 0) return
    const creds = Object.entries(satistfiedCredentialsSubmission).reduce(
      (acc: SelectedCredentialsFormat, [inputDescriptorId, credentials]) => {
        acc[inputDescriptorId] = { id: credentials[0]?.id, claimFormat: credentials[0]?.claimFormat }
        return acc
      },
      {}
    )
    setSelectedCredentialsSubmission(creds)
  }, [satistfiedCredentialsSubmission, credentialsRequested])

  const verifierName = credential?.verifierHostName

  const handleAcceptTouched = async () => {
    try {
      if (!agent || !credential.credentialsForRequest || !selectedCredentialsSubmission) return
      setShareInFlight(true)
      setButtonsVisible(false)
      await shareProof({
        agent,
        authorizationRequest: credential.authorizationRequest,
        credentialsForRequest: credential.credentialsForRequest,
        selectedCredentials: selectedCredentialsSubmission,
      })
      setAcceptModalVisible(true)
    } catch (err: unknown) {
      setButtonsVisible(true)
      setShareInFlight(false)
      const details = (() => {
        const maybe = err as { code?: string; message?: string }
        return maybe?.code ? `[${maybe.code}] ${maybe?.message ?? ''}` : (err as Error)?.message ?? err
      })()
      const error = new BifoldError(t('Error.Title1027'), t('Error.Message1027'), details, 1027)
      DeviceEventEmitter.emit(EventTypes.ERROR_ADDED, error)
    }
  }

  const handleDeclineTouched = async () => {
    toggleDeclineModalVisible()
    navigation.getParent()?.navigate(Stacks.TabStack, {
      screen: TabStacks.HomeStack,
      params: { screen: Screens.Home },
    })
  }

  const handleDismiss = () => {
    navigation.getParent()?.navigate(Stacks.TabStack, {
      screen: TabStacks.HomeStack,
      params: { screen: Screens.Home },
    })
  }

  const onCredChange = ({
    inputDescriptorID,
    id,
    claimFormat,
  }: {
    inputDescriptorID: string
    id: string
    claimFormat: string
  }) => {
    setSelectedCredentialsSubmission((prev) => ({ ...prev, [inputDescriptorID]: { id, claimFormat } }))
  }

  const handleAltCredChange = useCallback(
    (inputDescriptorID: string, selectedCredID: string, inputDescriptor: string) => {
      const submittionEntries = submission?.entries.find((e) => e.inputDescriptorId === inputDescriptor)
      const credsForEntry = submittionEntries?.credentials
      if (!credsForEntry) return
      navigation.navigate(Screens.OpenIDProofCredentialSelect, {
        inputDescriptorID,
        selectedCredID,
        altCredIDs: credsForEntry.map((c) => ({ id: c.id, claimFormat: c.claimFormat })),
        onCredChange,
      })
    },
    [submission, navigation]
  )

  // -- Unsatisfied path (no compatible creds) → leave the existing component
  //    behaviour but presented on the dark background.
  if (submission && !submission.areAllSatisfied) {
    return (
      <ScreenLayout screen={Screens.OpenIDProofPresentation}>
        <View style={styles.root}>
          <Background />
          <SafeAreaView edges={['top', 'bottom', 'left', 'right']} style={styles.safe}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
              <OpenIDUnsatisfiedProofRequest
                credentialName={submission?.name}
                requestPurpose={submission?.purpose}
                verifierName={verifierName}
              />
              <TouchableOpacity onPress={handleDismiss} style={styles.dismissButton}>
                <Text style={styles.dismissButtonText}>{t('Global.Dismiss')}</Text>
              </TouchableOpacity>
            </ScrollView>
          </SafeAreaView>
        </View>
      </ScreenLayout>
    )
  }

  // -- Loading path
  if (!selectedCredentialsSubmission || !submission) {
    return (
      <ScreenLayout screen={Screens.OpenIDProofPresentation}>
        <View style={styles.root}>
          <Background />
        </View>
      </ScreenLayout>
    )
  }

  const totalShared = countSharedAttributes(submission, selectedCredentialsSubmission, credentialsRequested)
  const allSharedItems = collectSharedAttributes(submission, selectedCredentialsSubmission, credentialsRequested)

  // Success state — replace the proof UI with the redesigned dark success
  // screen. "Done" returns the user to Home.
  if (acceptModalVisible) {
    return (
      <ScreenLayout screen={Screens.OpenIDProofPresentation}>
        <OpenIDProofSuccessScreen
          verifierName={verifierName ?? 'the verifier'}
          verifierDomain={verifierName}
          sharedAt={new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
          sharedAttributes={allSharedItems}
          onDone={handleDismiss}
        />
      </ScreenLayout>
    )
  }

  return (
    <ScreenLayout screen={Screens.OpenIDProofPresentation}>
      <View style={styles.root}>
        <Background />
        <SafeAreaView edges={['top', 'bottom', 'left', 'right']} style={styles.safe}>
        <ScrollView contentContainerStyle={styles.scrollContent} testID={testIdWithKey('ProofRequestScreen')}>
          <View style={styles.pill}>
            <View style={styles.pillDot} />
            <Text style={styles.pillText}>PROOF REQUEST</Text>
          </View>
          <Text style={styles.headline}>
            {verifierName ? `${verifierName} is requesting your information` : 'Information request'}
          </Text>

          <View style={styles.verifierCard}>
            <View style={styles.verifierAvatar}>
              <Text style={styles.verifierAvatarText}>{initials(verifierName ?? '?')}</Text>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.verifierName} numberOfLines={1}>
                {verifierName ?? 'Unknown verifier'}
              </Text>
              <View style={styles.verifierSubline}>
                <DCIcon name="verified" size={12} color={DC_PALETTE.accent} />
                <Text style={styles.verifierSublineText} numberOfLines={1}>
                  {verifierName ? `${verifierName} · Trusted issuer` : 'Trusted issuer'}
                </Text>
              </View>
            </View>
          </View>

          {Object.entries(selectedCredentialsSubmission).map(([inputDescriptorId, selected]) => {
            const sub = submission.entries.find((s) => s.inputDescriptorId === inputDescriptorId)
            const credSub = sub?.credentials.find((c) => c.id === selected.id)
            const record = credentialsRequested.find((c) => c.id === selected.id)
            if (!sub || !credSub || !record) return null
            return (
              <PresentationSection
                key={inputDescriptorId}
                title={sub.name ?? submission.name}
                purpose={sub.purpose ?? submission.purpose}
                record={record}
                requestedAttributes={credSub.requestedAttributes ?? []}
                hasAlternatives={sub.credentials.length > 1}
                onChange={() => handleAltCredChange(inputDescriptorId, selected.id, inputDescriptorId)}
              />
            )
          })}

          {totalShared > 0 ? (
            <View style={styles.callout}>
              <DCIcon name="info" size={14} color={DC_PALETTE.accent} />
              <Text style={styles.calloutText}>
                Selective disclosure: any attribute not listed above stays on this device.
              </Text>
            </View>
          ) : null}
        </ScrollView>

        {/* Persistent action row — Share/Decline sit pinned to the bottom so
            the user never has to scroll through long attribute lists to find
            them. */}
        <View style={styles.stickyActions}>
          <DCActionRow
            primaryLabel={
              shareInFlight
                ? t('Global.Send')
                : totalShared > 0
                  ? `Share ${totalShared} attribute${totalShared === 1 ? '' : 's'}`
                  : t('Global.Send')
            }
            primaryIcon="share"
            primaryLoading={shareInFlight}
            primaryDisabled={!buttonsVisible}
            onPrimary={handleAcceptTouched}
            secondaryLabel={t('Global.Decline')}
            onSecondary={toggleDeclineModalVisible}
          />
        </View>

        </SafeAreaView>
        <CommonRemoveModal
          usage={ModalUsage.ProofRequestDecline}
          visible={declineModalVisible}
          onSubmit={handleDeclineTouched}
          onCancel={toggleDeclineModalVisible}
        />
      </View>
    </ScreenLayout>
  )
}

const Background: React.FC = () => (
  <LinearGradient
    colors={DC_PALETTE.bgGrad as unknown as string[]}
    locations={[0, 0.55, 1]}
    start={{ x: 0.5, y: 0 }}
    end={{ x: 0.5, y: 1 }}
    style={StyleSheet.absoluteFill}
  />
)

const PresentationSection: React.FC<{
  title?: string
  purpose?: string
  record: WalletRecord
  requestedAttributes: string[]
  hasAlternatives: boolean
  onChange: () => void
}> = ({ title, purpose, record, requestedAttributes, hasAlternatives, onChange }) => {
  const design = useMemo(() => resolveDesign(record as never), [record])
  const display = useMemo(() => {
    try {
      return getCredentialForDisplay(record as never)
    } catch {
      return null
    }
  }, [record])

  const issuerLogo = display?.display?.issuer?.logo?.url
  const credentialName = display?.display?.name ?? title ?? 'Credential'
  const issuerName = display?.display?.issuer?.name

  const sharedItems = useMemo(() => buildSharedAttrItems(display?.attributes, requestedAttributes), [
    display?.attributes,
    requestedAttributes,
  ])

  return (
    <View style={{ marginTop: 18 }}>
      {purpose ? (
        <Text style={styles.purposeText} numberOfLines={2}>
          {purpose}
        </Text>
      ) : null}

      <View style={styles.credentialPicker}>
        {design ? (
          <DCCredentialMark design={design} size={44} />
        ) : issuerLogo ? (
          <Image source={{ uri: issuerLogo }} style={styles.issuerMark} resizeMode="contain" />
        ) : (
          <View style={[styles.issuerMark, styles.issuerMarkPlaceholder]}>
            <Text style={styles.issuerMarkText}>{initials(credentialName)}</Text>
          </View>
        )}
        <View style={{ flex: 1, marginLeft: 12, minWidth: 0 }}>
          <Text style={styles.usingLabel}>USING</Text>
          <Text style={styles.credentialName} numberOfLines={1}>
            {credentialName}
          </Text>
          {issuerName ? (
            <Text style={styles.credentialSub} numberOfLines={1}>
              {issuerName}
            </Text>
          ) : null}
        </View>
        {hasAlternatives ? (
          <TouchableOpacity onPress={onChange} accessibilityRole="button">
            <Text style={styles.changeLink}>Change</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {sharedItems.length > 0 ? (
        <>
          <Text style={styles.sectionLabel}>YOU&apos;LL SHARE</Text>
          <DCAttrList items={sharedItems} variant="shared" />
        </>
      ) : null}
    </View>
  )
}

function buildSharedAttrItems(
  attributes: Record<string, unknown> | undefined,
  requested: string[]
): DCAttrItem[] {
  if (!attributes || !requested.length) return []
  const out: DCAttrItem[] = []
  for (const key of requested) {
    const raw = lookup(attributes, key)
    if (raw === undefined || raw === null) continue
    const items = expandObject({ [key]: raw })
    for (const item of items) out.push({ ...item, shared: true })
  }
  return out
}

function countSharedAttributes(
  submission: ReturnType<typeof formatDifPexCredentialsForRequest>,
  selected: SelectedCredentialsFormat,
  records: WalletRecord[]
): number {
  return collectSharedAttributes(submission, selected, records).length
}

function collectSharedAttributes(
  submission: ReturnType<typeof formatDifPexCredentialsForRequest>,
  selected: SelectedCredentialsFormat,
  records: WalletRecord[]
): DCAttrItem[] {
  const out: DCAttrItem[] = []
  for (const [inputDescriptorId, sel] of Object.entries(selected)) {
    const entry: FormattedSubmissionEntry | undefined = submission?.entries.find(
      (s: FormattedSubmissionEntry) => s.inputDescriptorId === inputDescriptorId
    )
    const credSub: FormattedSelectedCredentialEntry | undefined = entry?.credentials.find(
      (c: FormattedSelectedCredentialEntry) => c.id === sel.id
    )
    const record = records.find((r) => r.id === sel.id)
    if (!entry || !credSub || !record) continue
    const display = (() => {
      try {
        return getCredentialForDisplay(record as never)
      } catch {
        return null
      }
    })()
    if (!display) continue
    for (const item of buildSharedAttrItems(display.attributes, credSub.requestedAttributes ?? [])) {
      out.push(item)
    }
  }
  return out
}

function lookup(attrs: Record<string, unknown>, path: string): unknown {
  if (path in attrs) return attrs[path]
  const parts = path.split('.')
  let cur: unknown = attrs
  for (const part of parts) {
    if (cur && typeof cur === 'object' && part in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[part]
    } else {
      return undefined
    }
  }
  return cur
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0] ?? '').join('').toUpperCase() || '?'
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: DC_PALETTE.bg },
  safe: { flex: 1 },
  scrollContent: { padding: 18, paddingBottom: 24 },
  stickyActions: {
    paddingHorizontal: 18,
    paddingTop: 4,
    paddingBottom: 8,
    backgroundColor: DC_PALETTE.bg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },

  pill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,200,120,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,200,120,0.25)',
    marginTop: 6,
    marginBottom: 12,
  },
  pillDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#FFC878', marginRight: 6 },
  pillText: { color: '#FFC878', fontSize: 11, fontWeight: '700', letterSpacing: 1.2 },

  headline: { color: '#FFFFFF', fontSize: 22, fontWeight: '700', lineHeight: 28 },

  verifierCard: {
    marginTop: 16,
    padding: 14,
    backgroundColor: DC_PALETTE.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: DC_PALETTE.cardBorder,
    flexDirection: 'row',
    alignItems: 'center',
  },
  verifierAvatar: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  verifierAvatarText: { color: '#062826', fontWeight: '700' },
  verifierName: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  verifierSubline: { flexDirection: 'row', alignItems: 'center', marginTop: 2, gap: 4 },
  verifierSublineText: { color: DC_PALETTE.muted, fontSize: 12 },

  purposeText: { color: DC_PALETTE.muted, fontSize: 12, fontWeight: '500', marginBottom: 8 },

  credentialPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DC_PALETTE.card,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: DC_PALETTE.cardBorder,
  },
  issuerMark: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#FFFFFF' },
  issuerMarkPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  issuerMarkText: { color: DC_PALETTE.bg, fontWeight: '700', fontSize: 16 },
  usingLabel: {
    color: DC_PALETTE.muted,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
    fontWeight: '600',
    marginBottom: 2,
  },
  credentialName: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  credentialSub: { color: DC_PALETTE.muted, fontSize: 12, marginTop: 2 },
  changeLink: { color: DC_PALETTE.accent, fontSize: 13, fontWeight: '600' },

  sectionLabel: {
    color: DC_PALETTE.subMuted,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.5,
    marginTop: 18,
    marginBottom: 10,
  },

  callout: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    padding: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(125,224,213,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(125,224,213,0.15)',
    gap: 8,
  },
  calloutText: { color: DC_PALETTE.muted, fontSize: 11.5, lineHeight: 16, flex: 1 },

  dismissButton: {
    marginTop: 24,
    paddingVertical: 15,
    borderRadius: 14,
    backgroundColor: DC_PALETTE.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismissButtonText: { color: '#062826', fontSize: 15, fontWeight: '700' },
})

export default OpenIDProofPresentation
