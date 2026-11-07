import type { ECL } from '../../lib/qr';
import { mergeConfig, makeDefaultConfig, type DecorationConfig, type DeepPartial, type FrameConfig } from '../types';
import { templateById } from './frameTemplates';

export interface Preset {
  id: string;
  name: string;
  note: string;
  fg: string;
  bg: string;
  ecl?: ECL;
  config: DeepPartial<DecorationConfig>;
}

/** Frame settings from a template, plus overrides. */
const fr = (id: string, extra: Partial<FrameConfig> = {}): Partial<FrameConfig> => ({ enabled: true, templateId: id, ...templateById(id)?.values, ...extra });
const logo = (id: string, bg: string, size = 20) => ({ source: id, bg, size });

export const PRESETS: Preset[] = [
  { id: 'minimal-white', name: 'Minimal White', note: 'Plain and quiet', fg: '#111111', bg: '#ffffff', config: { frame: fr('min-hairline'), border: { style: 'none' } } },
  { id: 'elegant-black', name: 'Elegant Black', note: 'Dark frame, white code', fg: '#111111', bg: '#ffffff', config: { frame: fr('mod-dark', { text: 'SCAN ME' }), modules: { shape: 'rounded', finder: 'rounded' }, border: { style: 'minimal', color: '#111111' }, corners: { style: 'rounded' } } },
  { id: 'corporate-blue', name: 'Corporate Blue', note: 'Calm and professional', fg: '#1f3a5f', bg: '#ffffff', config: { frame: fr('pro-corporate', { text: 'VISIT OUR WEBSITE' }), border: { style: 'solid', color: '#1f3a5f', thickness: 3, spacing: 6 } } },
  { id: 'modern-gradient', name: 'Modern Gradient', note: 'Teal to violet', fg: '#0f766e', bg: '#ffffff', config: { frame: fr('rnd-card', { text: 'SCAN ME', labelBg: '#0f766e', borderColor: '#0f766e' }), modules: { shape: 'extraRounded', finder: 'rounded' }, gradient: { enabled: true, type: 'linear', angle: 45, stops: [{ offset: 0, color: '#0f766e' }, { offset: 100, color: '#5b21b6' }] }, border: { style: 'gradient', color: '#0f766e', color2: '#5b21b6', thickness: 5 } } },
  { id: 'neon-glow', name: 'Neon Glow', note: 'Glowing border on dark', fg: '#0b0f1a', bg: '#ffffff', config: { frame: fr('mod-dark', { bg: '#0b0f1a', borderColor: '#0b0f1a', labelBg: '#0b0f1a', textColor: '#00e5ff', text: 'SCAN ME', thickness: 2 }), modules: { shape: 'rounded' }, border: { style: 'neon', color: '#00e5ff', color2: '#e6fbff', thickness: 6, shadow: 60, spacing: 10 } } },
  { id: 'luxury-gold', name: 'Luxury Gold', note: 'Black and gold', fg: '#2a1d05', bg: '#fbf6e9', config: { frame: fr('prm-gold', { text: 'SCAN TO VISIT' }), modules: { shape: 'rounded' }, gradient: { enabled: true, type: 'linear', angle: 60, stops: [{ offset: 0, color: '#6b4e0a' }, { offset: 100, color: '#1a1204' }] }, border: { style: 'double', color: '#c9a227', color2: '#8c6d1f', thickness: 8 }, corners: { style: 'doubleLine', color: '#c9a227' } } },
  { id: 'social-media', name: 'Social Media', note: 'Rounded, with a logo', fg: '#8a1f5f', bg: '#ffffff', ecl: 'H', config: { frame: fr('rnd-pill', { text: 'SCAN TO CONNECT', labelBg: '#a02d6b', borderColor: '#a02d6b' }), modules: { shape: 'extraRounded', finder: 'rounded' }, gradient: { enabled: true, type: 'linear', angle: 45, stops: [{ offset: 0, color: '#8a1f5f' }, { offset: 100, color: '#4b2a9a' }] }, logo: logo('instagram', '#a02d6b') } },
  { id: 'business-card', name: 'Business Card', note: 'Compact and clean', fg: '#2f2d28', bg: '#ffffff', config: { frame: fr('biz-card', { text: 'SCAN FOR MORE' }), modules: { shape: 'rounded' }, corners: { style: 'minimal', color: '#2f2d28' } } },
  { id: 'restaurant-menu', name: 'Restaurant Menu', note: 'Warm and ornamental', fg: '#5a2a12', bg: '#fffdf8', config: { frame: fr('dec-double', { text: 'SCAN FOR MENU' }), modules: { shape: 'rounded', finder: 'rounded' }, decor: { lines: { enabled: true, color: '#b4694f' }, ornaments: { enabled: true, color: '#b4694f' } } } },
  { id: 'wifi-sharing', name: 'Wi-Fi Sharing', note: 'Join the network', fg: '#1f4d3a', bg: '#ffffff', ecl: 'H', config: { frame: fr('rnd-card', { text: 'SCAN TO CONNECT', labelBg: '#1f6f78', borderColor: '#1f6f78' }), modules: { shape: 'rounded' }, border: { style: 'rounded', color: '#1f6f78', thickness: 4 }, logo: logo('wifi', '#1f6f78') } },
  { id: 'event-invitation', name: 'Event Invitation', note: 'Festive details', fg: '#4a1f5a', bg: '#ffffff', config: { frame: fr('dec-dotted', { text: "YOU'RE INVITED" }), modules: { shape: 'rounded' }, border: { style: 'decorative', color: '#4a1f5a', color2: '#b4694f' }, corners: { style: 'accents', color: '#b4694f' }, decor: { sparkles: { enabled: true, color: '#b4694f' } } } },
  { id: 'e-commerce', name: 'E-commerce', note: 'Shop banner and badge', fg: '#14532d', bg: '#ffffff', config: { frame: fr('mkt-banner', { text: 'SCAN TO SHOP', labelBg: '#14532d', borderColor: '#14532d' }), modules: { shape: 'extraRounded' }, border: { style: 'solid', color: '#14532d', thickness: 4 }, decor: { badge: { enabled: true, text: 'SALE', color: '#a3401f' } } } },
  { id: 'payment-qr', name: 'Payment QR', note: 'Trustworthy and clear', fg: '#1f3a5f', bg: '#ffffff', ecl: 'H', config: { frame: fr('pro-executive', { text: 'SCAN TO PAY' }), modules: { shape: 'rounded' }, border: { style: 'solid', color: '#1f3a5f', thickness: 3 }, logo: logo('upi', '#3d6b3a') } },
  { id: 'hotel-hospitality', name: 'Hotel & Hospitality', note: 'Ivory and brass', fg: '#2a2418', bg: '#fbf6e9', ecl: 'H', config: { frame: fr('prm-ivory', { text: 'SCAN FOR MORE' }), modules: { shape: 'extraRounded' }, border: { style: 'double', color: '#8c6d1f', color2: '#8c6d1f', thickness: 6 }, corners: { style: 'brackets', color: '#8c6d1f' }, logo: logo('hotel', '#4a3a1f') } },
  { id: 'marketing-campaign', name: 'Marketing Campaign', note: 'Bold call to action', fg: '#a3401f', bg: '#ffffff', config: { frame: fr('mkt-cta', { text: 'POINT YOUR CAMERA HERE' }), modules: { shape: 'rounded', finder: 'rounded' }, corners: { style: 'brackets', color: '#a3401f' }, decor: { indicators: { enabled: true, color: '#a3401f' }, background: { enabled: true, color: '#a3401f', opacity: 10 } } } },
];

export function presetConfig(preset: Preset): DecorationConfig {
  return mergeConfig(makeDefaultConfig(), preset.config);
}
