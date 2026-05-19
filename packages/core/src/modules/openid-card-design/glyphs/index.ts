import React from 'react'

import { BadgeGlyph, GlyphProps } from './BadgeGlyph'
import { CarGlyph } from './CarGlyph'
import { DiplomaGlyph } from './DiplomaGlyph'
import { GraduationCapGlyph } from './GraduationCapGlyph'
import { SealGlyph } from './SealGlyph'
import { ShieldGlyph } from './ShieldGlyph'
import { WreathGlyph } from './WreathGlyph'

import { CardGlyph } from '../types'

export { BadgeGlyph, CarGlyph, DiplomaGlyph, GraduationCapGlyph, SealGlyph, ShieldGlyph, WreathGlyph }
export type { GlyphProps }

const REGISTRY: Record<CardGlyph, React.FC<GlyphProps>> = {
  badge: BadgeGlyph,
  car: CarGlyph,
  diploma: DiplomaGlyph,
  'graduation-cap': GraduationCapGlyph,
  seal: SealGlyph,
  shield: ShieldGlyph,
  wreath: WreathGlyph,
}

export function getGlyphComponent(kind: CardGlyph | undefined): React.FC<GlyphProps> | null {
  if (!kind) return null
  return REGISTRY[kind] ?? null
}
