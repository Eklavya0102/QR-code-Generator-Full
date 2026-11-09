import { MAX_TEXT_LENGTH } from './validate';

/**
 * Content builders: structured forms that produce the exact text a phone expects (Wi-Fi join, vCard, UPI link ...).
 * Everything here is pure and runs in the browser.
 */
export type BuilderMode = 'wifi' | 'email' | 'phone' | 'sms' | 'whatsapp' | 'contact' | 'payment';
export type ContentMode = 'text' | 'url' | BuilderMode;

export const BUILDER_MODES: BuilderMode[] = ['wifi', 'email', 'phone', 'sms', 'whatsapp', 'contact', 'payment'];
export const isBuilderMode = (m: ContentMode): m is BuilderMode => (BUILDER_MODES as string[]).includes(m);
export const MODE_LABELS: Record<ContentMode, string> = {
  text: 'Text', url: 'URL', wifi: 'Wi-Fi', email: 'Email', phone: 'Phone', sms: 'SMS', whatsapp: 'WhatsApp', contact: 'Contact', payment: 'Payment',
};

export type Values = Record<string, string>;
export interface FieldSpec {
  key: string;
  label: string;
  type: 'text' | 'password' | 'email' | 'tel' | 'url' | 'textarea' | 'select' | 'checkbox' | 'note';
  placeholder?: string;
  hint?: string;
  options?: { value: string; label: string }[];
  maxLength?: number;
  autoComplete?: string;
  /** Short fields sharing a row. */
  half?: boolean;
  showIf?: (v: Values) => boolean;
}
export type BuildResult = { ok: true; value: string } | { ok: false; errors: Record<string, string>; empty: boolean };
export interface BuilderDef {
  id: BuilderMode;
  summary: string;
  fields: FieldSpec[];
  initial: Values;
  build: (v: Values) => BuildResult;
}

const val = (v: Values, k: string) => (v[k] ?? '').trim();
const enc = encodeURIComponent;
const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s);
const byteLength = (s: string) => new TextEncoder().encode(s).length;

/** Removes spaces, dashes, dots and brackets; accepts an optional leading + and 5 to 15 digits (E.164 maximum). */
export function normalizePhone(raw: string): string | null {
  const s = raw.replace(/[\s\-().]/g, '');
  return /^\+?\d{5,15}$/.test(s) ? s : null;
}
/** Amounts with at most two decimals and a value above zero, or null. */
function parseAmount(raw: string): string | null {
  const s = raw.trim();
  if (!/^\d{1,9}(\.\d{1,2})?$/.test(s) || Number(s) <= 0) return null;
  return s;
}
function isHttpUrl(s: string): boolean {
  try {
    const u = new URL(s);
    return (u.protocol === 'http:' || u.protocol === 'https:') && !!u.hostname;
  } catch {
    return false;
  }
}

function finish(errors: Record<string, string>, empty: boolean, make: () => string): BuildResult {
  if (Object.keys(errors).length) return { ok: false, errors, empty };
  const value = make();
  if (value.length > MAX_TEXT_LENGTH) {
    return { ok: false, empty: false, errors: { _form: `This content is ${value.length} characters and the limit is ${MAX_TEXT_LENGTH}. Shorten it.` } };
  }
  return { ok: true, value };
}

// ---------- Wi-Fi ----------
/** WIFI: format used by Android and iOS cameras. Backslash, semicolon, comma, colon and double quote are escaped. */
export const wifiEscape = (s: string) => s.replace(/([\\;,:"])/g, '\\$1');
const wifi: BuilderDef = {
  id: 'wifi',
  summary: 'Scanning joins the network. No typing the password.',
  initial: { ssid: '', security: 'WPA', password: '', hidden: '' },
  fields: [
    { key: 'ssid', label: 'Network name (SSID)', type: 'text', maxLength: 64, autoComplete: 'off', placeholder: 'Guest Wi-Fi' },
    { key: 'security', label: 'Security', type: 'select', options: [{ value: 'WPA', label: 'WPA / WPA2 / WPA3' }, { value: 'WEP', label: 'WEP (old)' }, { value: 'nopass', label: 'None (open network)' }] },
    { key: 'password', label: 'Password', type: 'password', maxLength: 64, autoComplete: 'off', showIf: (v) => v.security !== 'nopass' },
    { key: 'hidden', label: 'Hidden network', type: 'checkbox', hint: 'Turn on only if the network does not broadcast its name.' },
  ],
  build(v) {
    const errors: Record<string, string> = {};
    const ssid = v.ssid ?? '';
    const pass = v.password ?? '';
    const sec = v.security === 'WEP' || v.security === 'nopass' ? v.security : 'WPA';
    if (!ssid.trim()) errors.ssid = 'Enter the network name.';
    else if (byteLength(ssid) > 32) errors.ssid = 'A network name is at most 32 bytes (fewer characters if it has accents or symbols).';
    if (sec === 'WPA' && (pass.length < 8 || pass.length > 63)) errors.password = 'WPA passwords are 8 to 63 characters.';
    if (sec === 'WEP' && pass.length < 5) errors.password = 'Enter the WEP key (at least 5 characters).';
    return finish(errors, !ssid.trim() && !pass, () => `WIFI:T:${sec};S:${wifiEscape(ssid)};${sec === 'nopass' ? '' : `P:${wifiEscape(pass)};`}${v.hidden === 'true' ? 'H:true;' : ''};`);
  },
};

// ---------- Email / Phone / SMS / WhatsApp ----------
const email: BuilderDef = {
  id: 'email',
  summary: 'Opens a new message to this address.',
  initial: { to: '', subject: '', body: '' },
  fields: [
    { key: 'to', label: 'Send to', type: 'email', autoComplete: 'off', placeholder: 'hello@example.com' },
    { key: 'subject', label: 'Subject (optional)', type: 'text', maxLength: 120 },
    { key: 'body', label: 'Message (optional)', type: 'textarea', maxLength: 500 },
  ],
  build(v) {
    const errors: Record<string, string> = {};
    const to = val(v, 'to');
    if (!to) errors.to = 'Enter an email address.';
    else if (!isEmail(to)) errors.to = 'That does not look like an email address.';
    const params = [val(v, 'subject') && `subject=${enc(val(v, 'subject'))}`, (v.body ?? '').trim() && `body=${enc((v.body ?? '').trim())}`].filter(Boolean);
    return finish(errors, !to && !val(v, 'subject') && !val(v, 'body'), () => `mailto:${to}${params.length ? `?${params.join('&')}` : ''}`);
  },
};

const phone: BuilderDef = {
  id: 'phone',
  summary: 'Offers to call this number.',
  initial: { number: '' },
  fields: [{ key: 'number', label: 'Phone number', type: 'tel', autoComplete: 'off', placeholder: '+977 98 1234 5678', hint: 'Include the country code, for example +977 for Nepal.' }],
  build(v) {
    const errors: Record<string, string> = {};
    const n = normalizePhone(val(v, 'number'));
    if (!val(v, 'number')) errors.number = 'Enter a phone number.';
    else if (!n) errors.number = 'Use 5 to 15 digits, with an optional leading +.';
    return finish(errors, !val(v, 'number'), () => `tel:${n}`);
  },
};

const sms: BuilderDef = {
  id: 'sms',
  summary: 'Starts a text message. Prefilled text works on most phones, not all.',
  initial: { number: '', message: '' },
  fields: [
    { key: 'number', label: 'Phone number', type: 'tel', autoComplete: 'off', placeholder: '+977 98 1234 5678' },
    { key: 'message', label: 'Message (optional)', type: 'textarea', maxLength: 300 },
  ],
  build(v) {
    const errors: Record<string, string> = {};
    const n = normalizePhone(val(v, 'number'));
    if (!val(v, 'number')) errors.number = 'Enter a phone number.';
    else if (!n) errors.number = 'Use 5 to 15 digits, with an optional leading +.';
    const msg = (v.message ?? '').trim();
    return finish(errors, !val(v, 'number') && !msg, () => `sms:${n}${msg ? `?body=${enc(msg)}` : ''}`);
  },
};

const whatsapp: BuilderDef = {
  id: 'whatsapp',
  summary: 'Opens a WhatsApp chat with this number.',
  initial: { number: '', message: '' },
  fields: [
    { key: 'number', label: 'WhatsApp number', type: 'tel', autoComplete: 'off', placeholder: '977 98 1234 5678', hint: 'Country code first, for example 977 for Nepal. A leading + or 0 is removed for you.' },
    { key: 'message', label: 'First message (optional)', type: 'textarea', maxLength: 300 },
  ],
  build(v) {
    const errors: Record<string, string> = {};
    const digits = (v.number ?? '').replace(/\D/g, '').replace(/^0+/, '');
    if (!val(v, 'number')) errors.number = 'Enter a number.';
    else if (digits.length < 7 || digits.length > 15) errors.number = 'Use 7 to 15 digits including the country code.';
    const msg = (v.message ?? '').trim();
    return finish(errors, !val(v, 'number') && !msg, () => `https://wa.me/${digits}${msg ? `?text=${enc(msg)}` : ''}`);
  },
};

// ---------- Contact (vCard 3.0) ----------
export const vcardEscape = (s: string) => s.replace(/\r/g, '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,');
const contact: BuilderDef = {
  id: 'contact',
  summary: 'Scanning offers to save a contact. Shorter details make an easier code.',
  initial: { firstName: '', lastName: '', org: '', title: '', phone: '', email: '', url: '', street: '', city: '', region: '', postal: '', country: '', note: '' },
  fields: [
    { key: 'firstName', label: 'First name', type: 'text', maxLength: 60, half: true, autoComplete: 'off' },
    { key: 'lastName', label: 'Last name', type: 'text', maxLength: 60, half: true, autoComplete: 'off' },
    { key: 'org', label: 'Organization', type: 'text', maxLength: 80, half: true },
    { key: 'title', label: 'Job title', type: 'text', maxLength: 80, half: true },
    { key: 'phone', label: 'Phone', type: 'tel', half: true, autoComplete: 'off' },
    { key: 'email', label: 'Email', type: 'email', half: true, autoComplete: 'off' },
    { key: 'url', label: 'Website', type: 'url', placeholder: 'https://example.com' },
    { key: 'street', label: 'Street address', type: 'text', maxLength: 100 },
    { key: 'city', label: 'City', type: 'text', maxLength: 60, half: true },
    { key: 'region', label: 'State or province', type: 'text', maxLength: 60, half: true },
    { key: 'postal', label: 'Postal code', type: 'text', maxLength: 20, half: true },
    { key: 'country', label: 'Country', type: 'text', maxLength: 60, half: true },
    { key: 'note', label: 'Note', type: 'textarea', maxLength: 200 },
  ],
  build(v) {
    const errors: Record<string, string> = {};
    const g = (k: string) => val(v, k);
    if (!g('firstName') && !g('lastName') && !g('org')) errors.firstName = 'Enter a name or an organization.';
    const ph = g('phone') ? normalizePhone(g('phone')) : null;
    if (g('phone') && !ph) errors.phone = 'Use 5 to 15 digits, with an optional leading +.';
    if (g('email') && !isEmail(g('email'))) errors.email = 'That does not look like an email address.';
    if (g('url') && !isHttpUrl(g('url'))) errors.url = 'Enter a full web address that starts with http:// or https://.';
    const empty = Object.keys(v).every((k) => !val(v, k));
    return finish(errors, empty, () => {
      const fn = [g('firstName'), g('lastName')].filter(Boolean).join(' ') || g('org');
      const adr = ['street', 'city', 'region', 'postal', 'country'].some((k) => g(k));
      const lines = [
        'BEGIN:VCARD', 'VERSION:3.0',
        `N:${vcardEscape(g('lastName'))};${vcardEscape(g('firstName'))};;;`,
        `FN:${vcardEscape(fn)}`,
        g('org') && `ORG:${vcardEscape(g('org'))}`,
        g('title') && `TITLE:${vcardEscape(g('title'))}`,
        ph && `TEL;TYPE=CELL:${ph}`,
        g('email') && `EMAIL:${vcardEscape(g('email'))}`,
        g('url') && `URL:${g('url')}`,
        adr && `ADR;TYPE=WORK:;;${['street', 'city', 'region', 'postal', 'country'].map((k) => vcardEscape(g(k))).join(';')}`,
        g('note') && `NOTE:${vcardEscape(g('note'))}`,
        'END:VCARD',
      ].filter(Boolean);
      return lines.join('\r\n');
    });
  },
};

// ---------- Payment (UPI and PayPal.me only) ----------
const UPI_ID = /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z0-9.-]{2,64}$/;
const payment: BuilderDef = {
  id: 'payment',
  summary: 'Payment links for UPI and PayPal.me.',
  initial: { method: 'upi', vpa: '', payee: '', amount: '', note: '', handle: '', currency: 'USD' },
  fields: [
    { key: 'method', label: 'Payment method', type: 'select', options: [{ value: 'upi', label: 'UPI (India)' }, { value: 'paypal', label: 'PayPal.me' }] },
    { key: 'vpa', label: 'UPI ID', type: 'text', placeholder: 'name@bank', autoComplete: 'off', hint: 'Check this carefully. A wrong UPI ID sends money to someone else.', showIf: (v) => v.method !== 'paypal' },
    { key: 'payee', label: 'Payee name', type: 'text', maxLength: 60, showIf: (v) => v.method !== 'paypal' },
    { key: 'amount', label: 'Amount (optional)', type: 'text', placeholder: '250.00', half: true, hint: 'Leave empty to let the payer type it.' },
    { key: 'currency', label: 'Currency', type: 'select', half: true, options: ['USD', 'EUR', 'GBP', 'AUD', 'CAD', 'CHF', 'JPY'].map((c) => ({ value: c, label: c })), showIf: (v) => v.method === 'paypal' },
    { key: 'note', label: 'Note (optional)', type: 'text', maxLength: 50, showIf: (v) => v.method !== 'paypal' },
    { key: 'handle', label: 'PayPal.me name', type: 'text', placeholder: 'yourname', autoComplete: 'off', showIf: (v) => v.method === 'paypal' },
    {
      key: '_nepal', label: '', type: 'note',
      hint: 'eSewa, Khalti and Fonepay merchant QR codes are issued by your bank or wallet and carry account data that cannot be made up here. To restyle one, open Text mode and paste the text of your issued QR. Its checksum is verified for you.',
    },
  ],
  build(v) {
    const errors: Record<string, string> = {};
    const amountRaw = val(v, 'amount');
    const amount = amountRaw ? parseAmount(amountRaw) : null;
    if (amountRaw && !amount) errors.amount = 'Use an amount like 250 or 250.50, or leave it empty.';
    if (v.method === 'paypal') {
      const h = val(v, 'handle');
      if (!h) errors.handle = 'Enter your PayPal.me name.';
      else if (!/^[A-Za-z0-9]{3,20}$/.test(h)) errors.handle = 'PayPal.me names are 3 to 20 letters or digits.';
      const cur = ['USD', 'EUR', 'GBP', 'AUD', 'CAD', 'CHF', 'JPY'].includes(v.currency) ? v.currency : 'USD';
      return finish(errors, !h && !amountRaw, () => `https://www.paypal.me/${h}${amount ? `/${Number(amount)}${cur}` : ''}`);
    }
    const vpa = val(v, 'vpa');
    const payee = val(v, 'payee');
    if (!vpa) errors.vpa = 'Enter the UPI ID.';
    else if (!UPI_ID.test(vpa)) errors.vpa = 'A UPI ID looks like name@bank, with no spaces.';
    if (!payee) errors.payee = 'Enter the payee name.';
    return finish(errors, !vpa && !payee && !amountRaw && !val(v, 'note'), () => {
      const q = [`pa=${vpa}`, `pn=${enc(payee)}`, amount && `am=${Number(amount).toFixed(2)}`, 'cu=INR', val(v, 'note') && `tn=${enc(val(v, 'note'))}`].filter(Boolean);
      return `upi://pay?${q.join('&')}`;
    });
  },
};

export const BUILDERS: Record<BuilderMode, BuilderDef> = { wifi, email, phone, sms, whatsapp, contact, payment };
export const initialForms = (): Record<BuilderMode, Values> =>
  Object.fromEntries(BUILDER_MODES.map((m) => [m, { ...BUILDERS[m].initial }])) as Record<BuilderMode, Values>;
export const buildPayload = (mode: BuilderMode, values: Values): BuildResult => BUILDERS[mode].build(values);
export const firstError = (r: BuildResult & { ok: false }) => Object.values(r.errors)[0] ?? 'Check the highlighted fields.';

// ---------- EMVCo payment payload check (Fonepay, NepalPay and most national QR schemes) ----------
/** CRC-16/CCITT-FALSE (poly 0x1021, init 0xFFFF), the checksum EMVCo merchant QR codes end with. */
export function crc16ccitt(s: string): number {
  let crc = 0xffff;
  for (const b of new TextEncoder().encode(s)) {
    crc ^= b << 8;
    for (let i = 0; i < 8; i++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc;
}
/** null when the text is not an EMVCo merchant payload; otherwise whether its trailing CRC matches. */
export function checkEmvPayload(text: string): { valid: boolean } | null {
  const s = text.trim();
  if (!s.startsWith('000201')) return null;
  const m = /6304([0-9A-Fa-f]{4})$/.exec(s);
  if (!m) return { valid: false };
  return { valid: crc16ccitt(s.slice(0, -4)).toString(16).toUpperCase().padStart(4, '0') === m[1].toUpperCase() };
}
