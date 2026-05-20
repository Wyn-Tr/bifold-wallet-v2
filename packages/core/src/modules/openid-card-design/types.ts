// Shape of a card design — what the wallet renders for a given credential.
// Resolved by shape-matching the credential's attribute set; see
// ./registry/designRegistry.ts.

export type CardLayout =
  | 'employee-badge'
  | 'mdl'
  | 'alumni'
  | 'deans-list'
  | 'professional-license'
  | 'student-id'
  | 'diploma'
  | 'generic-portrait'
  | 'generic-landscape'

export type CardGlyph =
  | 'badge'
  | 'car'
  | 'wreath'
  | 'seal'
  | 'diploma'
  | 'graduation-cap'
  | 'shield'

export interface CardDesign {
  layout: CardLayout
  /**
   * 3-stop gradient palette ported from /Digicred Wallet/screens.jsx TYPES.
   *   primary   → 0%   (top-left, brightest)
   *   secondary → 60%  (middle, deeper)
   *   tint      → 100% (bottom-right, darkest)
   * Always 135° diagonal.
   */
  background: { primary: string; secondary?: string; tint?: string; gradient?: 'linear' | 'radial' }
  textColor: string
  accentColor?: string
  glyph?: CardGlyph
  /** Attribute path featured prominently on the card (e.g. 'license_number'). */
  primaryAttribute?: string
  /** Up to ~6 additional attribute paths shown in the card's field grid. */
  secondaryAttributes?: string[]
  /**
   * Attribute path rendered as a small line at the bottom of the card —
   * useful for non-glamorous-but-important context (issuing_authority,
   * domain, etc.).
   */
  footerAttribute?: string
}

export type CredentialFormatKey =
  | 'vc+sd-jwt'
  | 'jwt_vc_json'
  | 'jwt_vc_json-ld'
  | 'ldp_vc'
  | 'mso_mdoc'
  | 'openbadge_v3'

export interface MatchSpec {
  /** Every key MUST appear in the credential's attribute set. */
  required: string[]
  /** Each key present in the credential adds +1 to the match score. */
  preferred?: string[]
  /** If any key is present, the candidate is disqualified. */
  forbidden?: string[]
  /** If set, the credential's inferred format must be in this list. */
  format?: ReadonlyArray<CredentialFormatKey>
  /**
   * If set, at least one of these strings must appear in the credential's
   * `type` array (JSON-LD / OpenBadge / W3C JWT).
   */
  type?: string[]
  /**
   * Tie-breaker only — if the credential's `credentialConfigurationId` is in
   * this list, +1 score. Never used to disqualify.
   */
  configIdHint?: string[]
}

export interface DesignEntry {
  id: string
  design: CardDesign
  match: MatchSpec
}
