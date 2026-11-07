/**
 * Built-in logo tiles. These are simple, original glyphs drawn for this project (no external image URLs and no
 * third-party artwork). They are generic stylisations, not official brand marks; upload an official logo if you need one.
 * Glyphs are drawn on a 24x24 grid; "{c}" is replaced by the glyph color.
 */
export interface BuiltInLogo {
  id: string;
  label: string;
  color: string; // default tile color
  glyph: string;
}

const text = (s: string, size = 9) =>
  `<text x="12" y="${12 + size * 0.36}" font-family="Helvetica, Arial, sans-serif" font-weight="800" font-size="${size}" text-anchor="middle" fill="{c}">${s}</text>`;

export const BUILT_IN_LOGOS: BuiltInLogo[] = [
  { id: 'website', label: 'Website', color: '#2f2d28', glyph: '<circle cx="12" cy="12" r="7.5" fill="none" stroke="{c}" stroke-width="1.8"/><path d="M4.5 12h15M12 4.5c3 3.2 3 11.8 0 15M12 4.5c-3 3.2-3 11.8 0 15" fill="none" stroke="{c}" stroke-width="1.6"/>' },
  { id: 'whatsapp', label: 'WhatsApp', color: '#1f8f4d', glyph: '<path d="M12 4.5a7.5 7.5 0 0 0-6.4 11.4L4.6 19.4l3.6-1A7.5 7.5 0 1 0 12 4.5z" fill="none" stroke="{c}" stroke-width="1.8" stroke-linejoin="round"/><path d="M9.2 9.2c.3 2.6 2.3 4.6 5 5.1l1-1.2-1.8-.9-.8.6c-.8-.4-1.5-1.1-1.9-1.9l.6-.8-.9-1.8z" fill="{c}"/>' },
  { id: 'facebook', label: 'Facebook', color: '#1d4f91', glyph: '<path d="M13.4 19.5v-6.2h2.1l.4-2.5h-2.5V9.3c0-.8.3-1.3 1.4-1.3h1.2V5.8c-.3 0-1-.1-1.9-.1-2 0-3.3 1.2-3.3 3.4v1.7H8.7v2.5h2.1v6.2z" fill="{c}"/>' },
  { id: 'instagram', label: 'Instagram', color: '#a02d6b', glyph: '<rect x="5" y="5" width="14" height="14" rx="4" fill="none" stroke="{c}" stroke-width="1.8"/><circle cx="12" cy="12" r="3.2" fill="none" stroke="{c}" stroke-width="1.8"/><circle cx="16.1" cy="7.9" r="1" fill="{c}"/>' },
  { id: 'youtube', label: 'YouTube', color: '#b3261e', glyph: '<rect x="4" y="7" width="16" height="10" rx="3" fill="none" stroke="{c}" stroke-width="1.8"/><path d="M10.4 9.6v4.8l4.2-2.4z" fill="{c}"/>' },
  { id: 'linkedin', label: 'LinkedIn', color: '#1b5f8c', glyph: '<rect x="6" y="10" width="2.4" height="8" fill="{c}"/><circle cx="7.2" cy="7" r="1.5" fill="{c}"/><path d="M11 10h2.3v1.1c.5-.8 1.3-1.3 2.5-1.3 2 0 2.7 1.3 2.7 3.2V18h-2.4v-4.3c0-1-.3-1.7-1.3-1.7-1 0-1.5.7-1.5 1.8V18H11z" fill="{c}"/>' },
  { id: 'x', label: 'X', color: '#111111', glyph: '<path d="M6 6l12 12M18 6L6 18" stroke="{c}" stroke-width="2.2" stroke-linecap="round"/>' },
  { id: 'paypal', label: 'PayPal', color: '#173d7a', glyph: '<path d="M8.6 18.5l1.4-9.6c.1-.5.5-.9 1-.9h3.1c2 0 3.2 1 3.2 2.7 0 2.5-1.8 3.8-4 3.8h-1.4l-.5 4z" fill="none" stroke="{c}" stroke-width="1.7" stroke-linejoin="round"/>' },
  { id: 'upi', label: 'UPI', color: '#3d6b3a', glyph: text('UPI', 8) },
  { id: 'esewa', label: 'eSewa', color: '#4d8a1f', glyph: text('eS', 10) },
  { id: 'khalti', label: 'Khalti', color: '#5b2d8a', glyph: text('K', 13) },
  { id: 'wifi', label: 'Wi-Fi', color: '#1f6f78', glyph: '<path d="M5 10a10 10 0 0 1 14 0M7.6 12.8a6.3 6.3 0 0 1 8.8 0M10.2 15.5a2.6 2.6 0 0 1 3.6 0" fill="none" stroke="{c}" stroke-width="1.9" stroke-linecap="round"/><circle cx="12" cy="18" r="1.2" fill="{c}"/>' },
  { id: 'hotel', label: 'Hotel', color: '#4a3a1f', glyph: '<path d="M5 18.5V7M5 14h14v4.5M19 14v-2.2c0-1.5-1-2.3-2.4-2.3H11V14" fill="none" stroke="{c}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/><circle cx="8" cy="11" r="1.5" fill="{c}"/>' },
  { id: 'email', label: 'Email', color: '#8f4a33', glyph: '<rect x="4.5" y="6.5" width="15" height="11" rx="2" fill="none" stroke="{c}" stroke-width="1.8"/><path d="M5 8l7 5.2L19 8" fill="none" stroke="{c}" stroke-width="1.8" stroke-linejoin="round"/>' },
];

export const logoById = (id: string) => BUILT_IN_LOGOS.find((l) => l.id === id);
