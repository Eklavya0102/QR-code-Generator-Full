// @vitest-environment node
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? sources(p) : /\.(ts|tsx)$/.test(n) && !/\.test\./.test(n) ? [p] : [];
  });
}

describe('privacy guarantees', () => {
  const files = sources('src');
  it('never makes network requests', () => {
    for (const f of files) {
      const t = readFileSync(f, 'utf8');
      for (const banned of ['fetch(', 'XMLHttpRequest', 'sendBeacon', 'WebSocket', 'EventSource']) {
        expect(t, `${banned} in ${f}`).not.toContain(banned);
      }
    }
  });
  it('never persists user content', () => {
    for (const f of files) {
      const t = readFileSync(f, 'utf8');
      for (const banned of ['localStorage', 'sessionStorage', 'indexedDB', 'document.cookie']) {
        expect(t, `${banned} in ${f}`).not.toContain(banned);
      }
    }
  });
  it('loads no remote resources from the HTML shell', () => {
    expect(readFileSync('index.html', 'utf8')).not.toMatch(/(src|href)=["']https?:/);
  });
  it('ships a CSP that blocks remote connections', () => {
    const cfg = JSON.parse(readFileSync('vercel.json', 'utf8'));
    const csp = cfg.headers[0].headers.find((h: { key: string }) => h.key === 'Content-Security-Policy').value;
    expect(csp).toContain("connect-src 'self'");
    expect(csp).toContain("script-src 'self'");
  });
});
