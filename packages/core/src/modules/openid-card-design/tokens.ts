// Design tokens ported from `/Digicred Wallet/screens.jsx` PALETTE + TYPES.
// Shared by every Phase B layout and every Phase D screen.

export const DC_PALETTE = {
  headerTeal: '#0F8B82',
  bg: '#062826',
  bgGrad: ['#0E3F3B', '#062826', '#04201E'] as const,
  card: '#0C3733',
  cardBorder: 'rgba(255,255,255,0.06)',
  divider: 'rgba(255,255,255,0.08)',
  text: '#FFFFFF',
  muted: '#7FB6AF',
  subMuted: '#5B928C',
  accent: '#7DE0D5',
  danger: '#FF7A6E',
} as const

export interface DCTypeStyle {
  label: string
  color: string
  dark: string
  tint: string
  glyph: 'badge' | 'car' | 'cap' | 'wreath' | 'seal' | 'diploma' | 'shield'
}

export const DC_TYPES: Record<string, DCTypeStyle> = {
  employee: { label: 'Employee Badge', color: '#5B7FFF', dark: '#1E3A8A', tint: '#0A1F4D', glyph: 'badge' },
  mdl: { label: "Mobile Driver's License", color: '#2563EB', dark: '#1D4ED8', tint: '#0B1F44', glyph: 'car' },
  alumni: { label: 'Alumni', color: '#1E40AF', dark: '#1E3A8A', tint: '#0B1F44', glyph: 'diploma' },
  deans: { label: "Dean's List", color: '#D4A24C', dark: '#92400E', tint: '#1F1208', glyph: 'wreath' },
  license: { label: 'Professional License', color: '#0E9F8B', dark: '#065F46', tint: '#062021', glyph: 'seal' },
  student: { label: 'Student ID', color: '#2563EB', dark: '#1D4ED8', tint: '#0B1F44', glyph: 'cap' },
  diploma: { label: 'Diploma', color: '#1E5BA8', dark: '#1E3A8A', tint: '#0B1F44', glyph: 'diploma' },
}
