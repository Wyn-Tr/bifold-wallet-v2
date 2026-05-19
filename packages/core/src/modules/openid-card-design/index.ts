// Public API of the OID4VCI designer-card module.
//
// The wallet calls `resolveDesign(record)` to check if a credential should
// render with a branded card, then `<OpenIDCardRenderer>` to render it.
// Falls back to the existing `OpenIDCredentialCard` when `resolveDesign`
// returns null. See ./registry/designRegistry.ts for the shape matcher.

export * from './types'
export { DC_PALETTE, DC_TYPES } from './tokens'
export type { DCTypeStyle } from './tokens'

export { OpenIDCardRenderer } from './OpenIDCardRenderer'
export type { OpenIDCardRendererProps } from './OpenIDCardRenderer'

export { DCCredentialCard } from './layouts'
export type { DCCredentialCardProps, CredentialField, PhotoMode } from './layouts'

export { resolveDesign, hasDesignFor, DESIGN_REGISTRY } from './registry'
export { getNormalizedClaims } from './util/extractAttributes'
export type { SupportedCredentialRecord, NormalizedCredentialClaims } from './util/extractAttributes'
export { toAttrItem, expandObject, formatPrimitive, parseDate } from './util/toAttrItem'

export { getGlyphComponent } from './glyphs'
export type { GlyphProps } from './glyphs'

export * from './primitives'
export * from './animations'
