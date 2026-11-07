/** Decoration settings. Kept fully separate from the QR content and generation settings. */
export type ModuleShape = 'square' | 'rounded' | 'circle' | 'dots' | 'extraRounded' | 'diamond' | 'vertical' | 'horizontal';
export type FinderStyle = 'square' | 'rounded' | 'circular' | 'doubleRounded' | 'modern' | 'custom';
export type CornerStyle = 'square' | 'rounded' | 'circular' | 'extraRounded' | 'brackets' | 'doubleLine' | 'accents' | 'gradient' | 'minimal';
export type BorderStyle = 'none' | 'solid' | 'double' | 'dashed' | 'dotted' | 'gradient' | 'rounded' | 'shadow' | 'decorative' | 'neon' | 'minimal';
export type FrameLineStyle = 'solid' | 'double' | 'dashed' | 'dotted';
export type LabelLayout = 'none' | 'bottomBar' | 'topBar' | 'bottomPill' | 'topTab' | 'bubble' | 'ribbon' | 'dualBar';
export type FrameCategory = 'minimal' | 'rounded' | 'modern' | 'professional' | 'business' | 'marketing' | 'decorative' | 'premium';
export type Align = 'left' | 'center' | 'right';
export type PatternType = 'dots' | 'lines' | 'grid' | 'checks';
export type LogoShape = 'square' | 'rounded' | 'circle';
export type LogoPosition = 'center' | 'bottomRight';

export interface GradientStop {
  offset: number; // 0..100
  color: string;
}
export interface GradientConfig {
  enabled: boolean;
  type: 'linear' | 'radial';
  angle: number; // degrees, linear only
  stops: GradientStop[];
}
export interface FrameConfig {
  enabled: boolean;
  templateId: string;
  layout: LabelLayout;
  lineStyle: FrameLineStyle;
  bg: string;
  borderColor: string;
  thickness: number;
  radius: number;
  padding: number;
  extraWidth: number;
  extraHeight: number;
  shadow: number; // 0..100
  opacity: number; // 0..100 (frame background only)
  align: Align;
  text: string;
  textColor: string;
  labelBg: string;
  labelSize: number;
}
export interface BorderConfig {
  style: BorderStyle;
  thickness: number;
  color: string;
  color2: string;
  radius: number;
  spacing: number;
  opacity: number;
  gradientAngle: number;
  shadow: number;
}
export interface CornerConfig {
  style: CornerStyle;
  color: string;
  color2: string;
  size: number;
  thickness: number;
}
export interface ModuleConfig {
  shape: ModuleShape;
  scale: number; // 0.7..1 share of each cell a module fills
  finder: FinderStyle;
  finderCustomColors: boolean;
  finderOuter: string;
  finderInner: string;
  quietZone: number; // modules
}
export interface DecorLayer {
  enabled: boolean;
  color: string;
  opacity: number; // 0..100
  size: number; // 1..10
}
export interface DecorConfig {
  shapes: DecorLayer;
  ornaments: DecorLayer;
  lines: DecorLayer;
  sparkles: DecorLayer;
  pattern: DecorLayer;
  indicators: DecorLayer;
  badge: DecorLayer & { text: string };
  background: DecorLayer & { type: PatternType };
}
export interface LogoConfig {
  source: string; // 'none' | 'upload' | built-in logo id
  size: number; // % of the QR width
  shape: LogoShape;
  bg: string;
  bgEnabled: boolean;
  radius: number;
  padding: number;
  borderColor: string;
  borderWidth: number;
  position: LogoPosition;
}
export interface DecorationConfig {
  frame: FrameConfig;
  border: BorderConfig;
  corners: CornerConfig;
  modules: ModuleConfig;
  gradient: GradientConfig;
  decor: DecorConfig;
  logo: LogoConfig;
}
export type DecorationCategory = keyof DecorationConfig;
export type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };

const layer = (color: string, size = 5, opacity = 70): DecorLayer => ({ enabled: false, color, opacity, size });

export function makeDefaultConfig(): DecorationConfig {
  return {
    frame: {
      enabled: false, templateId: 'min-hairline', layout: 'none', lineStyle: 'solid', bg: '#ffffff', borderColor: '#2f2d28',
      thickness: 3, radius: 16, padding: 24, extraWidth: 0, extraHeight: 0, shadow: 0, opacity: 100, align: 'center',
      text: 'SCAN ME', textColor: '#ffffff', labelBg: '#2f2d28', labelSize: 26,
    },
    border: { style: 'none', thickness: 6, color: '#587360', color2: '#b4694f', radius: 12, spacing: 8, opacity: 100, gradientAngle: 45, shadow: 40 },
    corners: { style: 'square', color: '#587360', color2: '#b4694f', size: 34, thickness: 5 },
    modules: { shape: 'square', scale: 1, finder: 'square', finderCustomColors: false, finderOuter: '#587360', finderInner: '#2f2d28', quietZone: 4 },
    gradient: {
      enabled: false, type: 'linear', angle: 45,
      stops: [{ offset: 0, color: '#0f766e' }, { offset: 100, color: '#6d28d9' }],
    },
    decor: {
      shapes: layer('#587360'), ornaments: layer('#b4694f', 5, 85), lines: layer('#587360', 5, 60), sparkles: layer('#b4694f', 5, 85),
      pattern: layer('#587360', 5, 55), indicators: layer('#587360', 5, 90),
      badge: { ...layer('#b4694f', 5, 100), text: 'NEW' }, background: { ...layer('#587360', 5, 12), type: 'dots' },
    },
    logo: {
      source: 'none', size: 20, shape: 'rounded', bg: '#ffffff', bgEnabled: true, radius: 10, padding: 6,
      borderColor: '#ffffff', borderWidth: 0, position: 'center',
    },
  };
}

/** Deep-merges a partial config over a fresh default so presets only list what they change. */
export function mergeConfig(base: DecorationConfig, patch: DeepPartial<DecorationConfig>): DecorationConfig {
  const out = structuredClone(base) as unknown as Record<string, Record<string, unknown>>;
  for (const [cat, vals] of Object.entries(patch)) {
    if (!vals) continue;
    for (const [k, v] of Object.entries(vals as Record<string, unknown>)) {
      const cur = out[cat][k];
      out[cat][k] = cur && typeof cur === 'object' && !Array.isArray(cur) && v && typeof v === 'object' && !Array.isArray(v) ? { ...cur, ...v } : v;
    }
  }
  return out as unknown as DecorationConfig;
}

export const FRAME_LABELS = [
  'SCAN ME', 'SCAN HERE', 'SCAN TO VISIT', 'SCAN TO CONNECT', 'SCAN FOR MORE', 'POINT YOUR CAMERA HERE', 'GET STARTED', 'VISIT OUR WEBSITE',
];
