import type { FrameCategory, FrameConfig, LabelLayout } from '../types';

export interface FrameTemplate {
  id: string;
  category: FrameCategory;
  name: string;
  /** Values applied to the frame settings; everything stays editable afterwards. */
  values: Partial<FrameConfig> & { layout: LabelLayout };
}

export const FRAME_CATEGORIES: { id: FrameCategory; label: string }[] = [
  { id: 'minimal', label: 'Minimal' },
  { id: 'rounded', label: 'Rounded' },
  { id: 'modern', label: 'Modern' },
  { id: 'professional', label: 'Professional' },
  { id: 'business', label: 'Business' },
  { id: 'marketing', label: 'Marketing' },
  { id: 'decorative', label: 'Decorative' },
  { id: 'premium', label: 'Premium' },
];

const dark = '#2f2d28';
const sage = '#587360';
const terra = '#b4694f';
const navy = '#1f3a5f';
const gold = '#c9a227';

export const FRAME_TEMPLATES: FrameTemplate[] = [
  // Minimal
  { id: 'min-hairline', category: 'minimal', name: 'Hairline', values: { layout: 'none', bg: '#ffffff', borderColor: dark, thickness: 2, radius: 0, padding: 20, shadow: 0 } },
  { id: 'min-card', category: 'minimal', name: 'Soft card', values: { layout: 'none', bg: '#ffffff', borderColor: '#d6cfbb', thickness: 2, radius: 14, padding: 24, shadow: 30 } },
  { id: 'min-caption', category: 'minimal', name: 'Caption', values: { layout: 'bottomBar', bg: '#ffffff', borderColor: '#d6cfbb', thickness: 2, radius: 8, padding: 20, labelBg: '#ffffff', textColor: dark, labelSize: 22 } },
  { id: 'min-underline', category: 'minimal', name: 'Top caption', values: { layout: 'topBar', bg: '#ffffff', borderColor: dark, thickness: 2, radius: 0, padding: 20, labelBg: '#ffffff', textColor: dark, labelSize: 22 } },
  // Rounded
  { id: 'rnd-card', category: 'rounded', name: 'Rounded card', values: { layout: 'bottomBar', bg: '#ffffff', borderColor: sage, thickness: 4, radius: 34, padding: 22, labelBg: sage, textColor: '#ffffff' } },
  { id: 'rnd-pill', category: 'rounded', name: 'Pill label', values: { layout: 'bottomPill', bg: '#ffffff', borderColor: sage, thickness: 4, radius: 30, padding: 24, labelBg: sage, textColor: '#ffffff' } },
  { id: 'rnd-bubble', category: 'rounded', name: 'Bubble', values: { layout: 'bubble', bg: '#ffffff', borderColor: terra, thickness: 4, radius: 28, padding: 22, labelBg: terra, textColor: '#ffffff' } },
  // Modern
  { id: 'mod-dark', category: 'modern', name: 'Dark bar', values: { layout: 'bottomBar', bg: '#ffffff', borderColor: '#111111', thickness: 4, radius: 18, padding: 22, labelBg: '#111111', textColor: '#ffffff' } },
  { id: 'mod-tab', category: 'modern', name: 'Top tab', values: { layout: 'topTab', bg: '#ffffff', borderColor: '#111111', thickness: 4, radius: 16, padding: 24, labelBg: '#111111', textColor: '#ffffff' } },
  { id: 'mod-accent', category: 'modern', name: 'Accent bar', values: { layout: 'topBar', bg: '#faf8f3', borderColor: sage, thickness: 3, radius: 14, padding: 22, labelBg: sage, textColor: '#ffffff' } },
  // Professional
  { id: 'pro-corporate', category: 'professional', name: 'Corporate', values: { layout: 'bottomBar', bg: '#ffffff', borderColor: navy, thickness: 4, radius: 8, padding: 22, labelBg: navy, textColor: '#ffffff' } },
  { id: 'pro-executive', category: 'professional', name: 'Executive', values: { layout: 'dualBar', bg: '#ffffff', borderColor: navy, thickness: 3, radius: 6, padding: 22, labelBg: navy, textColor: '#ffffff' } },
  { id: 'pro-header', category: 'professional', name: 'Clean header', values: { layout: 'topBar', bg: '#ffffff', borderColor: '#6b675d', thickness: 3, radius: 6, padding: 22, labelBg: '#6b675d', textColor: '#ffffff' } },
  // Business
  { id: 'biz-card', category: 'business', name: 'Business card', values: { layout: 'bottomBar', bg: '#ffffff', borderColor: dark, thickness: 3, radius: 4, padding: 20, labelBg: dark, textColor: '#ffffff', labelSize: 22 } },
  { id: 'biz-contact', category: 'business', name: 'Contact', values: { layout: 'topBar', bg: '#faf8f3', borderColor: dark, thickness: 3, radius: 4, padding: 20, labelBg: '#e6ede3', textColor: dark, labelSize: 22 } },
  { id: 'biz-letter', category: 'business', name: 'Letterhead', values: { layout: 'bottomBar', bg: '#fffdf8', borderColor: '#b3ab95', thickness: 2, radius: 2, padding: 24, labelBg: '#f3efe4', textColor: dark, labelSize: 22 } },
  // Marketing
  { id: 'mkt-banner', category: 'marketing', name: 'Bold banner', values: { layout: 'ribbon', bg: '#ffffff', borderColor: terra, thickness: 5, radius: 14, padding: 26, labelBg: terra, textColor: '#ffffff', labelSize: 28 } },
  { id: 'mkt-cta', category: 'marketing', name: 'Call to action', values: { layout: 'bottomPill', bg: '#ffffff', borderColor: '#a3401f', thickness: 5, radius: 22, padding: 26, labelBg: '#a3401f', textColor: '#ffffff', labelSize: 28 } },
  { id: 'mkt-speech', category: 'marketing', name: 'Speech', values: { layout: 'bubble', bg: '#ffffff', borderColor: sage, thickness: 5, radius: 24, padding: 24, labelBg: sage, textColor: '#ffffff', labelSize: 26 } },
  { id: 'mkt-spot', category: 'marketing', name: 'Spotlight', values: { layout: 'topTab', bg: '#fff7ec', borderColor: '#a3401f', thickness: 5, radius: 12, padding: 26, labelBg: '#a3401f', textColor: '#ffffff', labelSize: 26 } },
  // Decorative
  { id: 'dec-double', category: 'decorative', name: 'Double line', values: { layout: 'bottomBar', lineStyle: 'double', bg: '#fffdf8', borderColor: terra, thickness: 9, radius: 10, padding: 26, labelBg: terra, textColor: '#ffffff' } },
  { id: 'dec-dashed', category: 'decorative', name: 'Dashed', values: { layout: 'bottomPill', lineStyle: 'dashed', bg: '#fffdf8', borderColor: sage, thickness: 5, radius: 20, padding: 28, labelBg: sage, textColor: '#ffffff' } },
  { id: 'dec-dotted', category: 'decorative', name: 'Dotted', values: { layout: 'topBar', lineStyle: 'dotted', bg: '#fffdf8', borderColor: terra, thickness: 6, radius: 18, padding: 28, labelBg: '#f6e7e0', textColor: '#8f4a33' } },
  // Premium
  { id: 'prm-gold', category: 'premium', name: 'Gold frame', values: { layout: 'bottomBar', lineStyle: 'double', bg: '#14110a', borderColor: gold, thickness: 9, radius: 10, padding: 26, labelBg: '#14110a', textColor: gold, labelSize: 24 } },
  { id: 'prm-ivory', category: 'premium', name: 'Ivory', values: { layout: 'dualBar', bg: '#fbf6e9', borderColor: '#8c6d1f', thickness: 4, radius: 6, padding: 26, labelBg: '#8c6d1f', textColor: '#fbf6e9', labelSize: 24 } },
  { id: 'prm-midnight', category: 'premium', name: 'Midnight', values: { layout: 'ribbon', bg: '#0f1626', borderColor: '#9aa7c7', thickness: 4, radius: 16, padding: 28, labelBg: '#9aa7c7', textColor: '#0f1626', labelSize: 24 } },
];

export const templateById = (id: string) => FRAME_TEMPLATES.find((t) => t.id === id);
