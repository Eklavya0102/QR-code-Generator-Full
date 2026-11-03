import { ShieldCheck } from 'lucide-react';

export function BrandMark() {
  return (
    <svg className="brand-mark" viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="6" fill="currentColor" />
      <g fill="#FAF9F6">
        <rect x="6" y="6" width="8" height="8" rx="1.5" />
        <rect x="18" y="6" width="8" height="8" rx="1.5" />
        <rect x="6" y="18" width="8" height="8" rx="1.5" />
        <rect x="18" y="18" width="3.5" height="3.5" />
        <rect x="22.5" y="22.5" width="3.5" height="3.5" />
      </g>
    </svg>
  );
}

export function Header() {
  return (
    <header className="site-header">
      <div className="wrap header-row">
        <div className="brand">
          <BrandMark />
          <div>
            <h1>QR Code Generator</h1>
            <p>Create QR codes. Keep your data private.</p>
          </div>
        </div>
        <span className="pill" title="Text, URLs and images are processed in this browser tab.">
          <ShieldCheck size={15} aria-hidden="true" />
          Generated on your device
        </span>
      </div>
    </header>
  );
}
