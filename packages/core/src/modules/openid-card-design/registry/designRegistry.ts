// Shape-matched card-design registry.
//
// resolveDesign(record) inspects the credential's flattened attribute set
// (claims/credentialSubject keys) and returns the highest-scoring design.
// `credentialConfigurationId` is only a tie-breaker hint — never a primary
// signal. Any future issuer producing the same-shaped credential auto-gets
// the right card.

import { CardDesign, DesignEntry, MatchSpec } from '../types'
import { getNormalizedClaims, SupportedCredentialRecord } from '../util/extractAttributes'

// =============================================================================
// Designs — one per layout the wallet ships. Colors mirror /Digicred Wallet/
// screens.jsx PALETTE + TYPES. Keep in sync with ../tokens.ts.
// =============================================================================

// Palette values are ported verbatim from /Digicred Wallet/screens.jsx TYPES
// (color/dark/tint). Gradient is linear 135° at 0/60/100% — see DCCredentialCard.

const STUDENT_ID_DESIGN: CardDesign = {
  layout: 'student-id',
  background: { primary: '#8B5CF6', secondary: '#5B21B6', tint: '#2A1361', gradient: 'linear' },
  textColor: '#FFFFFF',
  accentColor: '#7DE0D5',
  glyph: 'graduation-cap',
  primaryAttribute: 'student_id',
  secondaryAttributes: ['university', 'program', 'enrollment_year', 'expiry_date'],
}

const PROFESSIONAL_LICENSE_DESIGN: CardDesign = {
  layout: 'professional-license',
  background: { primary: '#0E9F8B', secondary: '#0B6F62', tint: '#072B26', gradient: 'linear' },
  textColor: '#FFFFFF',
  accentColor: '#7DE0D5',
  glyph: 'seal',
  primaryAttribute: 'license_number',
  secondaryAttributes: ['profession'],
  footerAttribute: 'issuing_authority',
}

const EMPLOYEE_BADGE_DESIGN: CardDesign = {
  layout: 'employee-badge',
  background: { primary: '#5B7FFF', secondary: '#1E3A8A', tint: '#0A1F4D', gradient: 'linear' },
  textColor: '#FFFFFF',
  accentColor: '#7DE0D5',
  glyph: 'badge',
  primaryAttribute: 'employee_id',
  secondaryAttributes: ['job_title', 'department', 'company', 'issue_date'],
}

const HEALTH_INSURANCE_DESIGN: CardDesign = {
  layout: 'generic-portrait',
  background: { primary: '#DC2626', secondary: '#7F1D1D', tint: '#2A0808', gradient: 'linear' },
  textColor: '#FFFFFF',
  accentColor: '#FECACA',
  glyph: 'shield',
  primaryAttribute: 'member_id',
  secondaryAttributes: ['plan_name', 'insurer', 'group_number', 'effective_date'],
}

const LOYALTY_DESIGN: CardDesign = {
  layout: 'generic-portrait',
  background: { primary: '#7C3AED', secondary: '#4C1D95', tint: '#1F0A4D', gradient: 'linear' },
  textColor: '#FFFFFF',
  accentColor: '#DDD6FE',
  glyph: 'badge',
  primaryAttribute: 'member_id',
  secondaryAttributes: ['tier', 'points', 'program_name', 'joined_date'],
}

const AGE_VERIFICATION_DESIGN: CardDesign = {
  layout: 'generic-portrait',
  background: { primary: '#0F766E', secondary: '#134E4A', tint: '#062021', gradient: 'linear' },
  textColor: '#FFFFFF',
  accentColor: '#7DE0D5',
  glyph: 'shield',
  primaryAttribute: 'over_21',
  secondaryAttributes: ['over_18', 'birth_date', 'nationality'],
}

const ACHIEVEMENT_GOLD_DESIGN: CardDesign = {
  layout: 'deans-list',
  background: { primary: '#D4A24C', secondary: '#92702A', tint: '#3D2E11', gradient: 'linear' },
  textColor: '#FFFFFF',
  accentColor: '#FEF3C7',
  glyph: 'wreath',
}

const ACHIEVEMENT_SKILL_DESIGN: CardDesign = {
  layout: 'deans-list',
  background: { primary: '#0EA5E9', secondary: '#0369A1', tint: '#0A2A45', gradient: 'linear' },
  textColor: '#FFFFFF',
  accentColor: '#BAE6FD',
  glyph: 'seal',
}

const ACHIEVEMENT_COURSE_DESIGN: CardDesign = {
  layout: 'deans-list',
  background: { primary: '#16A34A', secondary: '#14532D', tint: '#062014', gradient: 'linear' },
  textColor: '#FFFFFF',
  accentColor: '#BBF7D0',
  glyph: 'wreath',
}

const ENDORSEMENT_DESIGN: CardDesign = {
  layout: 'deans-list',
  background: { primary: '#9333EA', secondary: '#581C87', tint: '#240A3A', gradient: 'linear' },
  textColor: '#FFFFFF',
  accentColor: '#E9D5FF',
  glyph: 'seal',
}

const DIPLOMA_DESIGN: CardDesign = {
  layout: 'diploma',
  background: { primary: '#1E5BA8', secondary: '#0E3870', tint: '#06132B', gradient: 'linear' },
  textColor: '#FFFFFF',
  accentColor: '#E6D9A2',
  glyph: 'diploma',
  primaryAttribute: 'achievement.name',
  secondaryAttributes: ['name', 'student_id', 'date_conferred'],
}

const ALUMNI_DESIGN: CardDesign = {
  layout: 'alumni',
  background: { primary: '#C2410C', secondary: '#7C2D12', tint: '#3A1308', gradient: 'linear' },
  textColor: '#FFFFFF',
  accentColor: '#FCD34D',
  glyph: 'graduation-cap',
  primaryAttribute: 'alma_mater',
  secondaryAttributes: ['degree', 'major', 'graduation_year', 'gpa'],
}

const VOLUNTEER_DESIGN: CardDesign = {
  layout: 'generic-portrait',
  background: { primary: '#059669', secondary: '#064E3B', tint: '#021E14', gradient: 'linear' },
  textColor: '#FFFFFF',
  accentColor: '#A7F3D0',
  glyph: 'wreath',
  primaryAttribute: 'organization',
  secondaryAttributes: ['role', 'hours_contributed', 'year'],
}

const EVENT_TICKET_DESIGN: CardDesign = {
  layout: 'generic-landscape',
  background: { primary: '#EC4899', secondary: '#9D174D', tint: '#3D0820', gradient: 'linear' },
  textColor: '#FFFFFF',
  accentColor: '#FBCFE8',
  glyph: 'seal',
  primaryAttribute: 'ticket_id',
  secondaryAttributes: ['event_name', 'venue', 'seat', 'event_date'],
}

const RESEARCH_DESIGN: CardDesign = {
  layout: 'generic-portrait',
  background: { primary: '#475569', secondary: '#1E293B', tint: '#0A0F1A', gradient: 'linear' },
  textColor: '#FFFFFF',
  accentColor: '#CBD5E1',
  glyph: 'seal',
  primaryAttribute: 'project',
  secondaryAttributes: ['institution', 'role', 'attestation_date'],
}

const MDL_DESIGN: CardDesign = {
  layout: 'mdl',
  background: { primary: '#2563EB', secondary: '#1D4ED8', tint: '#0B1F44', gradient: 'linear' },
  textColor: '#FFFFFF',
  accentColor: '#FCD34D',
  glyph: 'car',
  primaryAttribute: 'document_number',
  // DOB + issue + expiry are core mDL fields and explicitly declared here so
  // the date-filter doesn't strip them. driving_privileges shows the category
  // codes (e.g. "B").
  secondaryAttributes: ['driving_privileges', 'birth_date', 'issue_date', 'expiry_date', 'issuing_country'],
  footerAttribute: 'issuing_authority',
}

// =============================================================================
// Registry — every entry's `match` predicate is keyed on the credential's
// attribute set. Order is irrelevant (we score all candidates and pick best).
// =============================================================================

export const DESIGN_REGISTRY: DesignEntry[] = [
  // mDL — only thing that ships mso_mdoc and uses driving_privileges. Strong match.
  {
    id: 'mDL',
    design: MDL_DESIGN,
    match: {
      required: ['document_number', 'driving_privileges'],
      preferred: ['birth_date', 'issue_date', 'expiry_date', 'issuing_country', 'portrait', 'age_over_18', 'age_over_21'],
      format: ['mso_mdoc'],
      configIdHint: ['mDL', 'org.iso.18013.5.1.mDL'],
    },
  },
  // Professional license — anything with license_number + profession.
  {
    id: 'ProfessionalLicense',
    design: PROFESSIONAL_LICENSE_DESIGN,
    match: {
      required: ['license_number'],
      preferred: ['profession', 'issuing_authority', 'issue_date', 'expiry_date'],
      configIdHint: ['ProfessionalLicense'],
    },
  },
  // Employee badge — employee_id + (job_title|department|company).
  {
    id: 'EmployeeBadge',
    design: EMPLOYEE_BADGE_DESIGN,
    match: {
      required: ['employee_id'],
      preferred: ['job_title', 'department', 'company', 'issue_date'],
      configIdHint: ['EmployeeBadge'],
    },
  },
  // Health insurance — member_id + (plan_name|insurer).
  {
    id: 'HealthInsurance',
    design: HEALTH_INSURANCE_DESIGN,
    match: {
      required: ['member_id', 'insurer'],
      preferred: ['plan_name', 'group_number', 'effective_date'],
      configIdHint: ['HealthInsurance'],
    },
  },
  // Loyalty — member_id + tier (+ points).
  {
    id: 'LoyaltyMembership',
    design: LOYALTY_DESIGN,
    match: {
      required: ['member_id', 'tier'],
      preferred: ['points', 'program_name', 'joined_date'],
      configIdHint: ['LoyaltyMembership'],
    },
  },
  // Age verification — over_18 or over_21 booleans.
  {
    id: 'AgeVerification',
    design: AGE_VERIFICATION_DESIGN,
    match: {
      required: ['over_21'],
      preferred: ['over_18', 'birth_date', 'nationality'],
      configIdHint: ['AgeVerification'],
    },
  },
  // Diploma — OBv3 Diploma or W3C diploma-shaped credential.
  {
    id: 'Diploma',
    design: DIPLOMA_DESIGN,
    match: {
      required: ['achievement.name'],
      preferred: ['date_conferred', 'student_id', 'achievement.achievementType'],
      type: ['Diploma', 'DiplomaCredential', 'AchievementCredential', 'OpenBadgeCredential'],
      configIdHint: ['Diploma'],
    },
  },
  // Endorsement — OBv3 EndorsementCredential.
  {
    id: 'AcademicEndorsement',
    design: ENDORSEMENT_DESIGN,
    match: {
      required: ['endorserName'],
      type: ['EndorsementCredential'],
      configIdHint: ['AcademicEndorsement'],
    },
  },
  // Achievement (gold) — generic OBv3 Award (Dean's List etc.).
  {
    id: 'AcademicExcellence',
    design: ACHIEVEMENT_GOLD_DESIGN,
    match: {
      required: ['achievement.name'],
      forbidden: ['student_id', 'license_number'],
      type: ['OpenBadgeCredential', 'AchievementCredential'],
      preferred: ['achievement.achievementType'],
      configIdHint: ['AcademicExcellence'],
    },
  },
  // Achievement (skill) — Certificate variant.
  {
    id: 'SkillsCertification',
    design: ACHIEVEMENT_SKILL_DESIGN,
    match: {
      required: ['achievement.name'],
      type: ['OpenBadgeCredential'],
      configIdHint: ['SkillsCertification'],
    },
  },
  // Achievement (course) — CourseRecord variant.
  {
    id: 'CourseCompletion',
    design: ACHIEVEMENT_COURSE_DESIGN,
    match: {
      required: ['achievement.name'],
      type: ['OpenBadgeCredential'],
      configIdHint: ['CourseCompletion'],
    },
  },
  // Alumni — alma_mater + degree.
  {
    id: 'AlumniCredential',
    design: ALUMNI_DESIGN,
    match: {
      required: ['alma_mater'],
      preferred: ['degree', 'major', 'graduation_year', 'gpa'],
      type: ['AlumniCredential'],
      configIdHint: ['AlumniCredential'],
    },
  },
  // Volunteer — organization + role (+ hours).
  {
    id: 'VolunteerCertificate',
    design: VOLUNTEER_DESIGN,
    match: {
      required: ['organization', 'role'],
      preferred: ['hours_contributed', 'year'],
      forbidden: ['license_number', 'employee_id'],
      configIdHint: ['VolunteerCertificate'],
    },
  },
  // Event ticket — event_name + ticket_id.
  {
    id: 'EventTicket',
    design: EVENT_TICKET_DESIGN,
    match: {
      required: ['ticket_id'],
      preferred: ['event_name', 'venue', 'seat', 'event_date'],
      configIdHint: ['EventTicket'],
    },
  },
  // Research attestation — institution + role + project.
  {
    id: 'ResearchAttestation',
    design: RESEARCH_DESIGN,
    match: {
      required: ['project', 'institution'],
      preferred: ['attestation_date', 'role'],
      forbidden: ['employee_id'],
      configIdHint: ['ResearchAttestation'],
    },
  },
  // Student ID — student_id + (university|program).
  // Last because student_id is broad — keep it from over-grabbing.
  {
    id: 'StudentID',
    design: STUDENT_ID_DESIGN,
    match: {
      required: ['student_id'],
      preferred: ['university', 'program', 'enrollment_year', 'expiry_date'],
      forbidden: ['driving_privileges', 'license_number', 'achievement.name'],
      configIdHint: ['StudentID'],
    },
  },
]

function evaluate(spec: MatchSpec, attrs: Set<string>, format: string | null, types: string[], configId?: string): number | null {
  if (spec.forbidden?.some((k) => attrs.has(k))) return null
  for (const k of spec.required) {
    if (!attrs.has(k)) return null
  }
  if (spec.format && format && !spec.format.includes(format as any)) return null
  if (spec.type && !spec.type.some((t) => types.includes(t))) return null

  let score = spec.required.length * 2
  if (spec.preferred) {
    for (const k of spec.preferred) if (attrs.has(k)) score += 1
  }
  if (configId && spec.configIdHint?.includes(configId)) score += 1
  return score
}

// Per-record cache. Resolution scans every registry entry and decodes the
// credential to read its attribute set — cheap once, wasteful on every render.
const DESIGN_CACHE = new WeakMap<object, CardDesign | null>()

export function resolveDesign(record: SupportedCredentialRecord): CardDesign | null {
  const cached = DESIGN_CACHE.get(record as object)
  if (cached !== undefined) return cached

  const { attrs, format, types, configId } = getNormalizedClaims(record)
  let best: { score: number; design: CardDesign } | null = null
  for (const entry of DESIGN_REGISTRY) {
    const score = evaluate(entry.match, attrs, format, types, configId)
    if (score === null) continue
    if (!best || score > best.score) best = { score, design: entry.design }
  }
  const result = best?.design ?? null
  DESIGN_CACHE.set(record as object, result)
  return result
}

export function hasDesignFor(record: SupportedCredentialRecord): boolean {
  return resolveDesign(record) !== null
}
