export type OpenIdVpErrorCode =
  | 'descriptor_missing_selection'
  | 'descriptor_no_candidates'
  | 'unsupported_claim_format'
  | 'vp_alg_incompatible'
  | 'holder_binding_unavailable'
  | 'submission_requirements_unsatisfied'
  | 'preflight_failed'

export class OpenIdVpError extends Error {
  public readonly code: OpenIdVpErrorCode
  public readonly meta?: Record<string, unknown>

  public constructor(code: OpenIdVpErrorCode, message: string, meta?: Record<string, unknown>) {
    super(message)
    this.code = code
    this.meta = meta
  }
}
