import { describe, expect, it } from 'vitest';
import { MAX_TEXT_LENGTH } from './validate';
import { BUILDERS, BUILDER_MODES, buildPayload, checkEmvPayload, crc16ccitt, initialForms, normalizePhone, type BuilderMode, type Values } from './payloads';

const build = (mode: BuilderMode, v: Values) => buildPayload(mode, { ...BUILDERS[mode].initial, ...v });
const okValue = (mode: BuilderMode, v: Values) => {
  const r = build(mode, v);
  if (!r.ok) throw new Error(`expected ok, got ${JSON.stringify(r.errors)}`);
  return r.value;
};
const errors = (mode: BuilderMode, v: Values) => {
  const r = build(mode, v);
  return r.ok ? {} : r.errors;
};

describe('Wi-Fi', () => {
  it('builds the standard WIFI: string', () => {
    expect(okValue('wifi', { ssid: 'My Net', password: 'pass1234' })).toBe('WIFI:T:WPA;S:My Net;P:pass1234;;');
  });
  it('escapes backslash, semicolon, comma, colon and quote', () => {
    expect(okValue('wifi', { ssid: 'a;b', password: 'x"y:z,w\\1' })).toBe('WIFI:T:WPA;S:a\\;b;P:x\\"y\\:z\\,w\\\\1;;');
  });
  it('supports hidden, WEP and open networks', () => {
    expect(okValue('wifi', { ssid: 'Net', password: 'longenough', hidden: 'true' })).toBe('WIFI:T:WPA;S:Net;P:longenough;H:true;;');
    expect(okValue('wifi', { ssid: 'Net', security: 'WEP', password: 'abcde' })).toBe('WIFI:T:WEP;S:Net;P:abcde;;');
    expect(okValue('wifi', { ssid: 'Cafe', security: 'nopass', password: 'ignored' })).toBe('WIFI:T:nopass;S:Cafe;;');
  });
  it('validates SSID and WPA password length', () => {
    expect(errors('wifi', { ssid: '', password: 'pass1234' }).ssid).toBeTruthy();
    expect(errors('wifi', { ssid: 'x'.repeat(33), password: 'pass1234' }).ssid).toBeTruthy();
    expect(errors('wifi', { ssid: 'Net', password: '1234567' }).password).toBeTruthy();
    expect(errors('wifi', { ssid: 'Net', password: 'x'.repeat(64) }).password).toBeTruthy();
  });
  it('counts SSID length in bytes', () => {
    expect(errors('wifi', { ssid: 'é'.repeat(17), password: 'pass1234' }).ssid).toBeTruthy(); // 34 bytes
  });
});

describe('Email, phone, SMS, WhatsApp', () => {
  it('email encodes subject and body', () => {
    expect(okValue('email', { to: 'a@b.co', subject: 'Hello there', body: 'Hi\nThere' })).toBe('mailto:a@b.co?subject=Hello%20there&body=Hi%0AThere');
    expect(okValue('email', { to: 'a@b.co' })).toBe('mailto:a@b.co');
    expect(errors('email', { to: 'nope' }).to).toBeTruthy();
  });
  it('phone normalises separators and keeps the plus', () => {
    expect(okValue('phone', { number: '+977 98-1234 5678' })).toBe('tel:+9779812345678');
    expect(okValue('phone', { number: '(022) 555.1234' })).toBe('tel:0225551234');
    expect(normalizePhone('12')).toBeNull();
    expect(normalizePhone('+1234567890123456')).toBeNull();
    expect(errors('phone', { number: 'abc' }).number).toBeTruthy();
  });
  it('sms adds an encoded body', () => {
    expect(okValue('sms', { number: '+977 9812345678', message: 'Hello world' })).toBe('sms:+9779812345678?body=Hello%20world');
    expect(okValue('sms', { number: '+9779812345678' })).toBe('sms:+9779812345678');
  });
  it('whatsapp builds a wa.me link from digits only', () => {
    expect(okValue('whatsapp', { number: '+977 98-1234 5678', message: 'Hi there' })).toBe('https://wa.me/9779812345678?text=Hi%20there');
    expect(okValue('whatsapp', { number: '00977 9812345678' })).toBe('https://wa.me/9779812345678');
    expect(errors('whatsapp', { number: '123' }).number).toBeTruthy();
  });
});

describe('Contact (vCard 3.0)', () => {
  it('builds a vCard with CRLF lines and escaped values', () => {
    const v = okValue('contact', { firstName: 'Asha', lastName: 'Rai', org: 'Acme, Inc.', phone: '+977 9812345678', email: 'asha@acme.com', url: 'https://acme.com', note: 'Line1\nLine2; ok' });
    expect(v.split('\r\n')).toEqual([
      'BEGIN:VCARD', 'VERSION:3.0', 'N:Rai;Asha;;;', 'FN:Asha Rai', 'ORG:Acme\\, Inc.', 'TEL;TYPE=CELL:+9779812345678', 'EMAIL:asha@acme.com',
      'URL:https://acme.com', 'NOTE:Line1\\nLine2\\; ok', 'END:VCARD',
    ]);
  });
  it('adds an address line only when there is one', () => {
    expect(okValue('contact', { firstName: 'A' })).not.toContain('ADR');
    expect(okValue('contact', { firstName: 'A', city: 'Kathmandu', country: 'Nepal' })).toContain('ADR;TYPE=WORK:;;;Kathmandu;;;Nepal');
  });
  it('needs a name or organization and validates fields', () => {
    expect(errors('contact', { phone: '+9779812345678' }).firstName).toBeTruthy();
    expect(okValue('contact', { org: 'Acme' })).toContain('FN:Acme');
    expect(errors('contact', { firstName: 'A', email: 'x' }).email).toBeTruthy();
    expect(errors('contact', { firstName: 'A', url: 'ftp://x' }).url).toBeTruthy();
    expect(errors('contact', { firstName: 'A', phone: '12' }).phone).toBeTruthy();
  });
});

describe('Payment', () => {
  it('builds a UPI link with percent-encoding (never "+")', () => {
    expect(okValue('payment', { vpa: 'shop@okbank', payee: 'Chai Shop', amount: '250', note: 'Order #1' })).toBe('upi://pay?pa=shop@okbank&pn=Chai%20Shop&am=250.00&cu=INR&tn=Order%20%231');
  });
  it('omits the amount when empty so the payer can type it', () => {
    expect(okValue('payment', { vpa: 'shop@okbank', payee: 'Chai Shop' })).toBe('upi://pay?pa=shop@okbank&pn=Chai%20Shop&cu=INR');
  });
  it('validates the UPI ID, payee and amount', () => {
    expect(errors('payment', { vpa: 'no-at-sign', payee: 'X' }).vpa).toBeTruthy();
    expect(errors('payment', { vpa: 'a b@bank', payee: 'X' }).vpa).toBeTruthy();
    expect(errors('payment', { vpa: 'a@bank', payee: '' }).payee).toBeTruthy();
    for (const bad of ['0', '-5', '1.234', 'abc', '1e3']) expect(errors('payment', { vpa: 'a@bank', payee: 'X', amount: bad }).amount).toBeTruthy();
  });
  it('builds a PayPal.me link', () => {
    expect(okValue('payment', { method: 'paypal', handle: 'chaishop', amount: '25', currency: 'USD' })).toBe('https://www.paypal.me/chaishop/25USD');
    expect(okValue('payment', { method: 'paypal', handle: 'chaishop' })).toBe('https://www.paypal.me/chaishop');
    expect(errors('payment', { method: 'paypal', handle: 'a b' }).handle).toBeTruthy();
  });
  it('never invents a Nepal wallet payload: only UPI and PayPal.me are offered', () => {
    const methods = BUILDERS.payment.fields.find((f) => f.key === 'method')?.options?.map((o) => o.value);
    expect(methods).toEqual(['upi', 'paypal']);
  });
});

describe('shared behaviour', () => {
  it('reports empty forms as empty (no error shown yet)', () => {
    for (const m of BUILDER_MODES) {
      const r = buildPayload(m, initialForms()[m]);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.empty).toBe(true);
    }
  });
  it('rejects content over the QR text limit', () => {
    const r = build('contact', { firstName: 'A', note: 'x'.repeat(200), street: 'y'.repeat(100), org: 'z'.repeat(80), title: 't'.repeat(80), city: 'c'.repeat(60), region: 'r'.repeat(60), country: 'k'.repeat(60) });
    expect(r.ok).toBe(true); // within the limit
    const big = buildPayload('email', { to: 'a@b.co', subject: '', body: ('é' as string).repeat(500) });
    expect(big.ok ? big.value.length <= MAX_TEXT_LENGTH : true).toBe(true);
    const over = buildPayload('email', { to: 'a@b.co', subject: 'x'.repeat(120), body: 'é'.repeat(500) });
    expect(over.ok).toBe(false);
    if (!over.ok) expect(over.errors._form).toMatch(/limit/);
  });
});

describe('EMVCo payment payload check', () => {
  it('computes CRC-16/CCITT-FALSE (standard check value)', () => {
    expect(crc16ccitt('123456789')).toBe(0x29b1);
  });
  const body = '00020101021126180014np.gov.nrb.test5204599953035245802NP5909Test Shop6008Kathmandu6304';
  const withCrc = body + crc16ccitt(body).toString(16).toUpperCase().padStart(4, '0');
  it('accepts a payload whose checksum matches', () => {
    expect(checkEmvPayload(withCrc)).toEqual({ valid: true });
    // surrounding whitespace and a lowercase checksum are tolerated
    expect(checkEmvPayload(` ${withCrc.slice(0, -4)}${withCrc.slice(-4).toLowerCase()}\n`)).toEqual({ valid: true });
  });
  it('flags a payload edited after the checksum was made', () => {
    expect(checkEmvPayload(withCrc.replace('Test Shop', 'Evil Shop'))).toEqual({ valid: false });
    expect(checkEmvPayload('000201010212')).toEqual({ valid: false });
  });
  it('ignores ordinary text', () => {
    expect(checkEmvPayload('https://example.com')).toBeNull();
    expect(checkEmvPayload('')).toBeNull();
  });
});
