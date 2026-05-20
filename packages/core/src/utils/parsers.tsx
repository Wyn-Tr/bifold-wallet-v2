export type ParseInvitationResult =
  | {
      success: true
      result: ParsedInvitation
    }
  | {
      success: false
      error: string
    }

export type ParsedInvitation = {
  type: 'didcomm' | 'openid-credential-offer' | 'openid-authorization-request'
  format: 'url' | 'parsed'
  data: string | Record<string, unknown>
}

export enum InvitationQrTypes {
  OPENID_INITIATE_ISSUANCE = 'openid-initiate-issuance://',
  OPENID_CREDENTIAL_OFFER = 'openid-credential-offer://',
  // TODO: I think we should not support openid://, as we mainly support openid4vp
  // But older requests do use openid:// I think (such as the DIIP dbc login)
  // but I think we're going to move to just openid4p in the future
  OPENID = 'openid://',
  OPENID4VP = 'openid4vp://',
  OPENID_VC = 'openid-vc://',
  DIDCOMM = 'didcomm://',
  HTTPS = 'https://',
}

export const isOpenIdCredentialOffer = (url: string) => {
  if (
    url.startsWith(InvitationQrTypes.OPENID_INITIATE_ISSUANCE) ||
    url.startsWith(InvitationQrTypes.OPENID_CREDENTIAL_OFFER)
  ) {
    return true
  }

  if (url.includes('credential_offer_uri=') || url.includes('credential_offer=')) {
    return true
  }

  return false
}

export const isOpenIdPresentationRequest = (url: string) => {
  if (
    url.startsWith(InvitationQrTypes.OPENID) ||
    url.startsWith(InvitationQrTypes.OPENID_VC) ||
    url.startsWith(InvitationQrTypes.OPENID4VP)
  ) {
    return true
  }

  if (url.includes('request_uri=') || url.includes('request=')) {
    return true
  }

  return false
}

export const isDidCommInvitation = (url: string) => {
  if (url.startsWith(InvitationQrTypes.DIDCOMM)) {
    return true
  }

  if (url.includes('c_i=') || url.includes('oob=') || url.includes('oobUrl=') || url.includes('d_m=')) {
    return true
  }

  return false
}

/**
 * VC Playground wraps the real exchange URL behind a redirector:
 *   `https://vcplayground.org/interactions/<urlencoded(realExchangeUrl)>?iuv=1`
 * The inner URL (after `/interactions/`, URL-decoded) is the actual chapi-
 * exchange endpoint. This helper extracts it so callers can POST directly
 * to the underlying issuer.
 *
 * Returns the unwrapped URL if the input matches the wrapper pattern AND
 * the decoded inner value is itself an http(s) URL; otherwise null.
 */
export const unwrapVcPlaygroundInteractions = (url: string): string | null => {
  const match = url.match(/^https?:\/\/[^/]+\/interactions\/([^?#]+)/i)
  if (!match) return null
  try {
    const decoded = decodeURIComponent(match[1])
    if (decoded.startsWith('https://') || decoded.startsWith('http://')) return decoded
    return null
  } catch {
    return null
  }
}

/**
 * Cheap synchronous check: does this URL even *plausibly* point at a VC-API
 * exchange? We only return true for URLs that look like exchange endpoints
 * (path contains `/exchanges/`, `/vc-api/`, or `/interactions/`) so we don't
 * blindly POST `{}` to arbitrary scanned URLs (which could hit webhooks or
 * state-changing endpoints). VC Playground uses `/interactions/` for its
 * QR-redirector wrapper around the underlying exchange URL; the chapi-
 * exchange spec uses the `/exchanges/` path convention directly.
 */
export const couldBeVcApiUrl = (url: string): boolean => {
  if (!url.startsWith('https://') && !url.startsWith('http://')) return false
  if (isOpenIdCredentialOffer(url)) return false
  if (isOpenIdPresentationRequest(url)) return false
  if (isDidCommInvitation(url)) return false
  return /\/(exchanges|vc-api|interactions)\//i.test(url)
}

const isVcApiExchangeShape = (json: unknown): json is Record<string, unknown> => {
  if (!json || typeof json !== 'object') return false
  const obj = json as Record<string, unknown>
  return (
    'protocols' in obj ||
    'interact' in obj ||
    'verifiablePresentationRequest' in obj ||
    'verifiablePresentation' in obj ||
    'verifiableCredential' in obj ||
    'redirectUrl' in obj
  )
}

/**
 * Probe a candidate VC-API exchange URL. Per the playground spec the wallet
 * starts an exchange with an HTTP POST (empty body) to the exchange URL; the
 * server responds with the first protocol step. We try POST first, then fall
 * back to GET in case the URL points at something custom that just publishes
 * an exchange descriptor.
 *
 * Returns the parsed JSON when the response looks like a VC-API exchange
 * (contains `protocols`, `interact`, `verifiablePresentationRequest`,
 * `verifiablePresentation`, `verifiableCredential`, or `redirectUrl`); returns
 * `null` on timeout, non-JSON, or schema mismatch — letting the caller fall
 * through to other handlers without side effects.
 */
export const probeVcApiExchange = async (url: string): Promise<Record<string, unknown> | null> => {
  const tryRequest = async (
    method: string,
    init: RequestInit
  ): Promise<Record<string, unknown> | null> => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 10_000)
    try {
      const response = await fetch(url, { ...init, signal: controller.signal })
      const contentType = response.headers.get('content-type') ?? ''
      const text = await response.text().catch(() => '')
      // eslint-disable-next-line no-console
      console.log(
        '[VC-API probe] HTTP ←',
        JSON.stringify({
          url,
          method,
          status: response.status,
          contentType,
          body: text.slice(0, 800),
        })
      )
      // 204 No Content is a valid VC-API "done" response, but useless as a
      // probe signal. Treat it as a miss here.
      if (!response.ok || response.status === 204) return null
      if (!contentType.includes('application/json')) return null
      let json: unknown
      try {
        json = JSON.parse(text)
      } catch {
        return null
      }
      const matches = isVcApiExchangeShape(json)
      if (!matches) {
        // eslint-disable-next-line no-console
        console.log(
          '[VC-API probe] shape mismatch — JSON did not contain protocols/interact/verifiablePresentation*/verifiableCredential/redirectUrl',
          JSON.stringify({ keys: typeof json === 'object' && json ? Object.keys(json) : null })
        )
        return null
      }
      return json as Record<string, unknown>
    } catch (err) {
      // eslint-disable-next-line no-console
      console.log(
        '[VC-API probe] fetch threw',
        JSON.stringify({ url, method, message: (err as Error)?.message })
      )
      return null
    } finally {
      clearTimeout(timer)
    }
  }

  // Per the playground exchange spec, POST is the canonical way to start.
  const postResult = await tryRequest('POST', {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: '{}',
  })
  if (postResult) return postResult

  // Some legacy / discovery endpoints still respond to GET with the same shape.
  return tryRequest('GET', {
    method: 'GET',
    headers: { accept: 'application/json' },
  })
}

export async function parseInvitationUrl(invitationUrl: string): Promise<ParseInvitationResult> {
  if (isOpenIdCredentialOffer(invitationUrl)) {
    return {
      success: true,
      result: {
        format: 'url',
        type: 'openid-credential-offer',
        data: invitationUrl,
      },
    }
  }

  if (isOpenIdPresentationRequest(invitationUrl)) {
    return {
      success: true,
      result: {
        format: 'url',
        type: 'openid-authorization-request',
        data: invitationUrl,
      },
    }
  }

  if (isDidCommInvitation(invitationUrl)) {
    return {
      success: true,
      result: {
        format: 'url',
        type: 'didcomm',
        data: invitationUrl,
      },
    }
  }

  return {
    success: false,
    error: 'Invitation not recognized.',
  }
}
