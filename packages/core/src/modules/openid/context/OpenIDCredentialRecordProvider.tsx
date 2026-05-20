import React, { createContext, PropsWithChildren, useCallback, useContext, useEffect, useState } from 'react'

import { BrandingOverlay } from '@bifold/oca'
import { BrandingOverlayType, CredentialOverlay, OCABundleResolveAllParams } from '@bifold/oca/build/legacy'
import {
  ClaimFormat,
  MdocRecord,
  MdocRepository,
  SdJwtVcRecord,
  SdJwtVcRepository,
  W3cCredentialRecord,
  W3cCredentialRepository,
} from '@credo-ts/core'
import { useAgent } from '@credo-ts/react-hooks'
import { recordsAddedByType, recordsRemovedByType } from '@credo-ts/react-hooks/build/recordUtils'
import { OpenBadgeCredentialRecord } from '@ajna-inc/openbadges'
import { JsonLdCredentialRecord } from '../jsonLd/JsonLdCredentialRecord'
import { JsonLdCredentialRepository } from '../jsonLd/JsonLdCredentialRepository'
import { useTranslation } from 'react-i18next'
import { TOKENS, useServices } from '../../../container-api'
import { buildFieldsFromW3cCredsCredential } from '../../../utils/oca'
import { getCredentialForDisplay } from '../display'
import { getOpenId4VcCredentialMetadata } from '../metadata'
import { OpenIDCredentialType } from '../types'

type OpenIDCredentialRecord =
  | W3cCredentialRecord
  | SdJwtVcRecord
  | MdocRecord
  | OpenBadgeCredentialRecord
  | JsonLdCredentialRecord
  | undefined

export type OpenIDCredentialContext = {
  openIdState: OpenIDCredentialRecordState
  getW3CCredentialById: (id: string) => Promise<W3cCredentialRecord | undefined>
  getSdJwtCredentialById: (id: string) => Promise<SdJwtVcRecord | undefined>
  getMdocCredentialById: (id: string) => Promise<MdocRecord | undefined>
  getOpenBadgeCredentialById: (id: string) => Promise<OpenBadgeCredentialRecord | undefined>
  getJsonLdCredentialById: (id: string) => Promise<JsonLdCredentialRecord | undefined>
  refreshOpenBadgeCredentials: () => Promise<void>
  refreshJsonLdCredentials: () => Promise<void>
  storeCredential: (
    cred: W3cCredentialRecord | SdJwtVcRecord | MdocRecord | OpenBadgeCredentialRecord | JsonLdCredentialRecord
  ) => Promise<void>
  removeCredential: (
    cred: W3cCredentialRecord | SdJwtVcRecord | MdocRecord | OpenBadgeCredentialRecord | JsonLdCredentialRecord,
    type: OpenIDCredentialType
  ) => Promise<void>
  resolveBundleForCredential: (
    credential:
      | SdJwtVcRecord
      | W3cCredentialRecord
      | MdocRecord
      | OpenBadgeCredentialRecord
      | JsonLdCredentialRecord
  ) => Promise<CredentialOverlay<BrandingOverlay>>
}

export type OpenIDCredentialRecordState = {
  openIDCredentialRecords: Array<OpenIDCredentialRecord>
  w3cCredentialRecords: Array<W3cCredentialRecord>
  sdJwtVcRecords: Array<SdJwtVcRecord>
  mdocVcRecords: Array<MdocRecord>
  openBadgeCredentialRecords: Array<OpenBadgeCredentialRecord>
  jsonLdCredentialRecords: Array<JsonLdCredentialRecord>
  isLoading: boolean
}

const addW3cRecord = (record: W3cCredentialRecord, state: OpenIDCredentialRecordState): OpenIDCredentialRecordState => {
  const newRecordsState = [...state.w3cCredentialRecords]
  newRecordsState.unshift(record)

  return {
    ...state,
    w3cCredentialRecords: newRecordsState,
  }
}

const removeW3cRecord = (
  record: W3cCredentialRecord,
  state: OpenIDCredentialRecordState
): OpenIDCredentialRecordState => {
  const newRecordsState = [...state.w3cCredentialRecords]
  const index = newRecordsState.findIndex((r) => r.id === record.id)
  if (index > -1) {
    newRecordsState.splice(index, 1)
  }

  return {
    ...state,
    w3cCredentialRecords: newRecordsState,
  }
}

const addSdJwtRecord = (record: SdJwtVcRecord, state: OpenIDCredentialRecordState): OpenIDCredentialRecordState => {
  const newRecordsState = [...state.sdJwtVcRecords]
  newRecordsState.unshift(record)

  return {
    ...state,
    sdJwtVcRecords: newRecordsState,
  }
}

const removeSdJwtRecord = (record: SdJwtVcRecord, state: OpenIDCredentialRecordState): OpenIDCredentialRecordState => {
  const newRecordsState = [...state.sdJwtVcRecords]
  const index = newRecordsState.findIndex((r) => r.id === record.id)
  if (index > -1) {
    newRecordsState.splice(index, 1)
  }

  return {
    ...state,
    sdJwtVcRecords: newRecordsState,
  }
}

const addMdocRecord = (record: MdocRecord, state: OpenIDCredentialRecordState): OpenIDCredentialRecordState => {
  const newRecordsState = [...state.mdocVcRecords]
  newRecordsState.unshift(record)

  return {
    ...state,
    mdocVcRecords: newRecordsState,
  }
}

const removeMdocRecord = (record: MdocRecord, state: OpenIDCredentialRecordState): OpenIDCredentialRecordState => {
  const newRecordsState = [...state.mdocVcRecords]
  const index = newRecordsState.findIndex((r) => r.id === record.id)
  if (index > -1) {
    newRecordsState.splice(index, 1)
  }

  return {
    ...state,
    mdocVcRecords: newRecordsState,
  }
}

const addOpenBadgeRecord = (
  record: OpenBadgeCredentialRecord,
  state: OpenIDCredentialRecordState
): OpenIDCredentialRecordState => {
  const newRecordsState = [...state.openBadgeCredentialRecords]
  newRecordsState.unshift(record)

  return {
    ...state,
    openBadgeCredentialRecords: newRecordsState,
  }
}

const removeOpenBadgeRecord = (
  record: OpenBadgeCredentialRecord,
  state: OpenIDCredentialRecordState
): OpenIDCredentialRecordState => {
  const newRecordsState = [...state.openBadgeCredentialRecords]
  const index = newRecordsState.findIndex((r) => r.id === record.id)
  if (index > -1) {
    newRecordsState.splice(index, 1)
  }

  return {
    ...state,
    openBadgeCredentialRecords: newRecordsState,
  }
}

const addJsonLdRecord = (
  record: JsonLdCredentialRecord,
  state: OpenIDCredentialRecordState
): OpenIDCredentialRecordState => {
  const newRecordsState = [...state.jsonLdCredentialRecords]
  newRecordsState.unshift(record)
  return { ...state, jsonLdCredentialRecords: newRecordsState }
}

const removeJsonLdRecord = (
  record: JsonLdCredentialRecord,
  state: OpenIDCredentialRecordState
): OpenIDCredentialRecordState => {
  const newRecordsState = [...state.jsonLdCredentialRecords]
  const index = newRecordsState.findIndex((r) => r.id === record.id)
  if (index > -1) {
    newRecordsState.splice(index, 1)
  }
  return { ...state, jsonLdCredentialRecords: newRecordsState }
}

const defaultState: OpenIDCredentialRecordState = {
  openIDCredentialRecords: [],
  w3cCredentialRecords: [],
  sdJwtVcRecords: [],
  mdocVcRecords: [],
  openBadgeCredentialRecords: [],
  jsonLdCredentialRecords: [],
  isLoading: true,
}

interface OpenIDCredentialProviderProps {
  children: React.ReactNode
}

const OpenIDCredentialRecordContext = createContext<OpenIDCredentialContext>(null as unknown as OpenIDCredentialContext)

const isW3CCredentialRecord = (record: W3cCredentialRecord) => {
  return record.getTags()?.claimFormat === ClaimFormat.JwtVc
}

const isSdJwtCredentialRecord = (record: SdJwtVcRecord) => {
  return 'compactSdJwtVc' in record
}

const filterW3CCredentialsOnly = (credentials: W3cCredentialRecord[]) => {
  return credentials.filter((r) => isW3CCredentialRecord(r))
}

const filterSdJwtCredentialsOnly = (credentials: SdJwtVcRecord[]) => {
  return credentials.filter((r) => isSdJwtCredentialRecord(r))
}

// eslint-disable-next-line react/prop-types
export const OpenIDCredentialRecordProvider: React.FC<PropsWithChildren<OpenIDCredentialProviderProps>> = ({
  children,
}: OpenIDCredentialProviderProps) => {
  const [state, setState] = useState<OpenIDCredentialRecordState>(defaultState)

  const { agent } = useAgent()
  const [logger, bundleResolver] = useServices([TOKENS.UTIL_LOGGER, TOKENS.UTIL_OCA_RESOLVER])
  const { i18n } = useTranslation()

  function checkAgent() {
    if (!agent) {
      const error = 'Agent undefined!'
      logger.error(`[OpenIDCredentialRecordProvider] ${error}`)
      throw new Error(error)
    }
  }

  async function getW3CCredentialById(id: string): Promise<W3cCredentialRecord | undefined> {
    checkAgent()
    return await agent?.w3cCredentials.getCredentialRecordById(id)
  }

  async function getSdJwtCredentialById(id: string): Promise<SdJwtVcRecord | undefined> {
    checkAgent()
    return await agent?.sdJwtVc.getById(id)
  }

  async function getMdocCredentialById(id: string): Promise<MdocRecord | undefined> {
    checkAgent()
    return await agent?.mdoc.getById(id)
  }

  async function getOpenBadgeCredentialById(id: string): Promise<OpenBadgeCredentialRecord | undefined> {
    checkAgent()
    const openbadgesApi = (agent?.modules as Record<string, unknown> | undefined)?.openbadges as
      | {
          getCredentialById: (id: string) => Promise<OpenBadgeCredentialRecord | null>
          getAllCredentials?: () => Promise<OpenBadgeCredentialRecord[]>
        }
      | undefined
    const record = await openbadgesApi?.getCredentialById(id)
    if (!record) {
      const all = await openbadgesApi?.getAllCredentials?.()
      const fallback = all?.find((r) => r.id === id)
      if (fallback) return fallback
    }
    return record ?? undefined
  }

  /**
   * Force-fetch all OpenBadge / JsonLd credentials and replace the local
   * state. Called on focus by ListCredentials so the list is always current
   * — defensive against any subscription event we might miss.
   *
   * Memoised so consumers' `useEffect([refresh*])` doesn't fire on every
   * provider re-render.
   */
  const refreshOpenBadgeCredentials = useCallback(async (): Promise<void> => {
    if (!agent) return
    const openbadgesApi = (agent.modules as Record<string, unknown> | undefined)?.openbadges as
      | { getAllCredentials?: () => Promise<OpenBadgeCredentialRecord[]> }
      | undefined
    if (!openbadgesApi?.getAllCredentials) return
    try {
      const records = await openbadgesApi.getAllCredentials()
      setState((prev) => ({ ...prev, openBadgeCredentialRecords: records ?? [] }))
    } catch (err) {
      logger.warn(
        '[OpenIDCredentialRecordProvider] refreshOpenBadgeCredentials failed',
        err as Record<string, unknown>
      )
    }
  }, [agent, logger])

  const refreshJsonLdCredentials = useCallback(async (): Promise<void> => {
    if (!agent) return
    try {
      const repo = agent.dependencyManager.resolve(JsonLdCredentialRepository)
      const records = await repo.getAll(agent.context)
      setState((prev) => ({ ...prev, jsonLdCredentialRecords: records ?? [] }))
    } catch (err) {
      logger.warn(
        '[OpenIDCredentialRecordProvider] refreshJsonLdCredentials failed',
        err as Record<string, unknown>
      )
    }
  }, [agent, logger])

  async function getJsonLdCredentialById(id: string): Promise<JsonLdCredentialRecord | undefined> {
    checkAgent()
    if (!agent) return undefined
    try {
      const repo = agent.dependencyManager.resolve(JsonLdCredentialRepository)
      return (await repo.findById(agent.context, id)) ?? undefined
    } catch {
      return undefined
    }
  }

  async function storeCredential(
    cred: W3cCredentialRecord | SdJwtVcRecord | MdocRecord | OpenBadgeCredentialRecord | JsonLdCredentialRecord
  ): Promise<void> {
    checkAgent()
    if (cred instanceof W3cCredentialRecord) {
      await agent?.dependencyManager.resolve(W3cCredentialRepository).save(agent.context, cred)
    } else if (cred instanceof SdJwtVcRecord) {
      await agent?.dependencyManager.resolve(SdJwtVcRepository).save(agent.context, cred)
    } else if (cred instanceof MdocRecord) {
      await agent?.dependencyManager.resolve(MdocRepository).save(agent.context, cred)
    } else if ((cred as { type?: string })?.type === 'OpenBadgeCredentialRecord') {
      // OpenBadge / JsonLd records are persisted by their own repositories via
      // the bridge in receiveJsonLdCredential.ts; nothing to do here. We keep
      // the branch so accidental calls don't silently no-op past the check.
      // (string-compare instead of `instanceof` — Metro can bundle two copies
      // of the OpenBadgeCredentialRecord class.)
    } else if ((cred as { type?: string })?.type === 'JsonLdCredentialRecord') {
      // Same as above — bridge already persisted it.
    }
  }

  async function deleteCredential(
    cred: W3cCredentialRecord | SdJwtVcRecord | MdocRecord | OpenBadgeCredentialRecord | JsonLdCredentialRecord,
    type: OpenIDCredentialType
  ) {
    checkAgent()
    if (type === OpenIDCredentialType.W3cCredential) {
      await agent?.w3cCredentials.removeCredentialRecord(cred.id)
    } else if (type === OpenIDCredentialType.SdJwtVc) {
      await agent?.sdJwtVc.deleteById(cred.id)
    } else if (type === OpenIDCredentialType.Mdoc) {
      await agent?.mdoc.deleteById(cred.id)
    } else if (type === OpenIDCredentialType.OpenBadge) {
      const openbadgesApi = (agent?.modules as Record<string, unknown> | undefined)?.openbadges as
        | { deleteCredential: (id: string) => Promise<void> }
        | undefined
      await openbadgesApi?.deleteCredential(cred.id)
    } else if (type === OpenIDCredentialType.JsonLd) {
      if (!agent) return
      const repo = agent.dependencyManager.resolve(JsonLdCredentialRepository)
      const record = await repo.findById(agent.context, cred.id)
      if (record) await repo.delete(agent.context, record)
    }
  }

  const resolveBundleForCredential = async (
    credential:
      | SdJwtVcRecord
      | W3cCredentialRecord
      | MdocRecord
      | OpenBadgeCredentialRecord
      | JsonLdCredentialRecord
  ): Promise<CredentialOverlay<BrandingOverlay>> => {
    const credentialDisplay = getCredentialForDisplay(credential)
    const openIdMetadata = getOpenId4VcCredentialMetadata(credential)
    const credentialConfigurationId = openIdMetadata?.credentialConfigurationId

    const params: OCABundleResolveAllParams = {
      identifiers: {
        schemaId: '',
        credentialDefinitionId: credentialConfigurationId ?? credentialDisplay.id,
      },
      meta: {
        alias: credentialDisplay.display.issuer.name,
        credConnectionId: undefined,
        credName: credentialDisplay.display.name,
      },
      attributes: buildFieldsFromW3cCredsCredential(credentialDisplay),
      language: i18n.language,
    }

    const bundle = await bundleResolver.resolveAllBundles(params)
    const _bundle = bundle as CredentialOverlay<BrandingOverlay>

    const brandingOverlay: BrandingOverlay = new BrandingOverlay('none', {
      capture_base: 'none',
      type: BrandingOverlayType.Branding10,
      primary_background_color: credentialDisplay.display.backgroundColor,
      background_image: credentialDisplay.display.backgroundImage?.url,
      logo: credentialDisplay.display.logo?.url,
    })
    const ocaBundle: CredentialOverlay<BrandingOverlay> = {
      ..._bundle,
      presentationFields: bundle.presentationFields,
      brandingOverlay: brandingOverlay,
    }

    return ocaBundle
  }

  useEffect(() => {
    if (!agent) return

    agent.w3cCredentials?.getAllCredentialRecords().then((w3cCredentialRecords) => {
      setState((prev) => ({
        ...prev,
        w3cCredentialRecords: filterW3CCredentialsOnly(w3cCredentialRecords),
        isLoading: false,
      }))
    })

    agent.sdJwtVc?.getAll().then((creds) => {
      setState((prev) => ({
        ...prev,
        sdJwtVcRecords: filterSdJwtCredentialsOnly(creds),
        isLoading: false,
      }))
    })

    agent.mdoc
      ?.getAll()
      .then((creds) => {
        setState((prev) => ({
          ...prev,
          mdocVcRecords: creds ?? [],
          isLoading: false,
        }))
      })
      .catch((err) => {
        logger.warn('[OpenIDCredentialRecordProvider] Failed to load mdoc credentials', err)
      })

    const openbadgesApi = (agent.modules as Record<string, unknown> | undefined)?.openbadges as
      | { getAllCredentials?: () => Promise<OpenBadgeCredentialRecord[]> }
      | undefined
    openbadgesApi?.getAllCredentials?.()
      .then((records) => {
        setState((prev) => ({ ...prev, openBadgeCredentialRecords: records ?? [] }))
      })
      .catch((err) => {
        logger.warn('[OpenIDCredentialRecordProvider] Failed to load OpenBadge credentials', err)
      })

    try {
      const jsonLdRepo = agent.dependencyManager.resolve(JsonLdCredentialRepository)
      jsonLdRepo
        .getAll(agent.context)
        .then((records) => {
          setState((prev) => ({ ...prev, jsonLdCredentialRecords: records ?? [] }))
        })
        .catch((err) => {
          logger.warn('[OpenIDCredentialRecordProvider] Failed to load JsonLd credentials', err)
        })
    } catch (err) {
      logger.warn('[OpenIDCredentialRecordProvider] JsonLdCredentialRepository not registered', err as Record<string, unknown>)
    }
  }, [agent, logger])

  useEffect(() => {
    if (state.isLoading) {
      return
    }
    if (!agent?.events?.observable) {
      return
    }

    const w3c_credentialAdded$ = recordsAddedByType(agent, W3cCredentialRecord).subscribe((record) => {
      //This handler will return ANY creds added to the wallet even DidComm
      //Sounds like a bug in the hooks package
      //This check will safe guard the flow untill a fix goes to the hooks
      if (isW3CCredentialRecord(record)) {
        setState(addW3cRecord(record, state))
      }
    })

    const w3c_credentialRemoved$ = recordsRemovedByType(agent, W3cCredentialRecord).subscribe((record) => {
      setState(removeW3cRecord(record, state))
    })

    const sdjwt_credentialAdded$ = recordsAddedByType(agent, SdJwtVcRecord).subscribe((record) => {
      //This handler will return ANY creds added to the wallet even DidComm
      //Sounds like a bug in the hooks package
      //This check will safe guard the flow untill a fix goes to the hooks
      setState(addSdJwtRecord(record, state))
      // if (isW3CCredentialRecord(record)) {
      //   setState(addW3cRecord(record, state))
      // }
    })

    const sdjwt_credentialRemoved$ = recordsRemovedByType(agent, SdJwtVcRecord).subscribe((record) => {
      setState(removeSdJwtRecord(record, state))
    })

    const mdoc_credentialAdded$ = recordsAddedByType(agent, MdocRecord).subscribe((record) => {
      setState((prev) => addMdocRecord(record, prev))
    })

    const mdoc_credentialRemoved$ = recordsRemovedByType(agent, MdocRecord).subscribe((record) => {
      setState((prev) => removeMdocRecord(record, prev))
    })

    const openbadge_credentialAdded$ = recordsAddedByType(agent, OpenBadgeCredentialRecord).subscribe((record) => {
      setState((prev) => addOpenBadgeRecord(record, prev))
    })

    const openbadge_credentialRemoved$ = recordsRemovedByType(agent, OpenBadgeCredentialRecord).subscribe((record) => {
      setState((prev) => removeOpenBadgeRecord(record, prev))
    })

    const jsonLd_credentialAdded$ = recordsAddedByType(agent, JsonLdCredentialRecord).subscribe((record) => {
      setState((prev) => addJsonLdRecord(record, prev))
    })

    const jsonLd_credentialRemoved$ = recordsRemovedByType(agent, JsonLdCredentialRecord).subscribe((record) => {
      setState((prev) => removeJsonLdRecord(record, prev))
    })

    return () => {
      w3c_credentialAdded$.unsubscribe()
      w3c_credentialRemoved$.unsubscribe()
      sdjwt_credentialAdded$.unsubscribe()
      sdjwt_credentialRemoved$.unsubscribe()
      mdoc_credentialAdded$.unsubscribe()
      mdoc_credentialRemoved$.unsubscribe()
      openbadge_credentialAdded$.unsubscribe()
      openbadge_credentialRemoved$.unsubscribe()
      jsonLd_credentialAdded$.unsubscribe()
      jsonLd_credentialRemoved$.unsubscribe()
    }
  }, [state, agent])

  return (
    <OpenIDCredentialRecordContext.Provider
      value={{
        openIdState: state,
        storeCredential: storeCredential,
        removeCredential: deleteCredential,
        getW3CCredentialById: getW3CCredentialById,
        getSdJwtCredentialById: getSdJwtCredentialById,
        getMdocCredentialById: getMdocCredentialById,
        getOpenBadgeCredentialById: getOpenBadgeCredentialById,
        getJsonLdCredentialById: getJsonLdCredentialById,
        refreshOpenBadgeCredentials: refreshOpenBadgeCredentials,
        refreshJsonLdCredentials: refreshJsonLdCredentials,
        resolveBundleForCredential: resolveBundleForCredential,
      }}
    >
      {children}
    </OpenIDCredentialRecordContext.Provider>
  )
}

export const useOpenIDCredentials = () => useContext(OpenIDCredentialRecordContext)
