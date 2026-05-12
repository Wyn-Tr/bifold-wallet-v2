import { MdocRecord, SdJwtVcRecord, W3cCredentialRecord } from '@credo-ts/core'
import { OpenBadgeCredentialRecord } from '@ajna-inc/openbadges'
import { JsonLdCredentialRecord } from '../jsonLd/JsonLdCredentialRecord'
import { useAgent } from '@credo-ts/react-hooks'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DeviceEventEmitter } from 'react-native'
import { EventTypes } from '../../../constants'
import { BifoldError } from '../../../types/error'
import {
  resolveOpenId4VciOffer,
} from '../offerResolve'
import { getCredentialsForProofRequest } from '../resolverProof'
import { OpenId4VPRequestRecord, OpenId4VciPendingCredentialOffer } from '../types'

type OpenIDContextProps = {
  openIDUri?: string
  openIDPresentationUri?: string
}

export const useOpenID = ({
  openIDUri,
  openIDPresentationUri,
}: OpenIDContextProps):
  | SdJwtVcRecord
  | W3cCredentialRecord
  | MdocRecord
  | OpenBadgeCredentialRecord
  | JsonLdCredentialRecord
  | OpenId4VPRequestRecord
  | OpenId4VciPendingCredentialOffer
  | undefined => {
  const [openIdRecord, setOpenIdRecord] = useState<
    | SdJwtVcRecord
    | W3cCredentialRecord
    | MdocRecord
    | OpenBadgeCredentialRecord
    | JsonLdCredentialRecord
    | OpenId4VPRequestRecord
    | OpenId4VciPendingCredentialOffer
  >()

  const { agent } = useAgent()
  const { t } = useTranslation()

  const resolveOpenIDCredential = useCallback(
    async (uri: string) => {
      if (!agent) {
        return
      }
      try {
        const resolvedCredentialOffer = await resolveOpenId4VciOffer({
          agent: agent,
          uri: uri,
        })

        const offerPayload = resolvedCredentialOffer.credentialOfferPayload as {
          grants?: Record<string, unknown>
          user_pin_required?: boolean | string
        }

        const preAuthGrant = offerPayload?.grants?.['urn:ietf:params:oauth:grant-type:pre-authorized_code'] as
          | { tx_code?: { input_mode?: 'numeric' | 'text'; length?: number; description?: string }; user_pin_required?: boolean }
          | undefined

        const previewAttributes = (() => {
          const payload = resolvedCredentialOffer.credentialOfferPayload as unknown as Record<string, unknown> | undefined
          const previewCandidates = [
            payload?.credential_preview,
            payload?.credentialPreview,
            payload?.preview,
            payload?.claims,
            payload?.credentialSubject,
            Array.isArray(payload?.credentials)
              ? (payload?.credentials as Array<Record<string, unknown>>)[0]?.credentialSubject
              : undefined,
          ]

          for (const candidate of previewCandidates) {
            if (candidate && typeof candidate === 'object' && !Array.isArray(candidate)) {
              return candidate as Record<string, unknown>
            }
          }

          return undefined
        })()

        const pendingOffer: OpenId4VciPendingCredentialOffer = {
          type: 'OpenId4VciPendingCredentialOffer',
          createdAt: new Date().toISOString(),
          resolvedCredentialOffer,
          txCode: preAuthGrant?.tx_code,
          userPinRequired:
            preAuthGrant?.user_pin_required === true ||
            offerPayload?.user_pin_required === true ||
            offerPayload?.user_pin_required === 'true',
          previewAttributes,
        }

        return pendingOffer
      } catch (err: unknown) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const e = err as any
        // eslint-disable-next-line no-console
        console.log('[OID4VCI] receive failed →', JSON.stringify({
          message: e?.message,
          name: e?.name,
          status: e?.response?.status,
          responseBody: e?.response?.data ?? e?.response?.body,
          stack: e?.stack ? String(e.stack).split('\n').slice(0, 6).join('\n') : undefined,
        }))
        const error = new BifoldError(
          t('Error.Title1024'),
          t('Error.Message1024'),
          (err as Error)?.message ?? err,
          1043
        )
        DeviceEventEmitter.emit(EventTypes.ERROR_ADDED, error)
      }
    },
    [agent, t]
  )

  const resolveOpenIDPresentationRequest = useCallback(
    async (uri: string) => {
      if (!agent) {
        return
      }
      try {
        const record = await getCredentialsForProofRequest({
          agent: agent,
          uri: uri,
        })
        return record
      } catch (err: unknown) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const e = err as any
        // eslint-disable-next-line no-console
        console.log('[OID4VP] presentation resolve failed →', JSON.stringify({
          message: e?.message,
          name: e?.name,
          status: e?.response?.status,
          responseBody: e?.response?.data ?? e?.response?.body,
        }))
        const error = new BifoldError(
          t('Error.Title1043'),
          t('Error.Message1043'),
          (err as Error)?.message ?? err,
          1043
        )
        DeviceEventEmitter.emit(EventTypes.ERROR_ADDED, error)
      }
    },
    [agent, t]
  )

  useEffect(() => {
    if (!openIDPresentationUri) {
      return
    }
    resolveOpenIDPresentationRequest(openIDPresentationUri).then((value) => {
      if (value) {
        setOpenIdRecord(value)
      }
    })
  }, [openIDPresentationUri, resolveOpenIDPresentationRequest])

  useEffect(() => {
    if (!openIDUri) {
      return
    }
    resolveOpenIDCredential(openIDUri).then((value) => {
      if (value) {
        setOpenIdRecord(value)
      }
    })
  }, [openIDUri, resolveOpenIDCredential])

  return openIdRecord
}
