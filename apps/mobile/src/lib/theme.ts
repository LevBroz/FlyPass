import type { BranchCategory } from '@pg/contracts';

export const colors = {
  navy: '#102A35',
  navy2: '#1B3D4B',
  green: '#007F78',
  greenSoft: '#E1F1EF',
  gold: '#DCAE64',
  goldSoft: '#F8EEDC',
  bg: '#F5F7F4',
  paper: '#F3EAD8',
  card: '#FFFFFF',
  ink: '#102A35',
  muted: '#5B6E75',
  line: '#DDE4E1',
  danger: '#B4423A',
  dangerSoft: '#FBE9E7',
  white: '#FFFFFF',
};

export const radius = { sm: 10, md: 14, lg: 20, pill: 999 };
export const space = (n: number) => n * 4;

export const CATEGORY_STYLE: Record<BranchCategory, { glyph: string; tint: string; label: string }> = {
  food: { glyph: '☕', tint: '#C9772E', label: 'Comida y café' },
  lodging: { glyph: '⌂', tint: '#2A6F97', label: 'Alojamiento' },
  experience: { glyph: '✦', tint: '#007F78', label: 'Experiencia' },
  shop: { glyph: '◈', tint: '#8A5A9E', label: 'Tienda' },
};
