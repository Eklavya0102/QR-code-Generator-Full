import { BrandMark } from './Header';

const REPO = import.meta.env.VITE_REPO_URL;

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="wrap">
        <div className="footer-grid">
          <div className="footer-brand">
            <div className="brand">
              <BrandMark />
              <strong>QR Code Generator</strong>
            </div>
            <p>Create QR codes. Keep your data private.</p>
          </div>
          <section aria-labelledby="footer-privacy">
            <h3 id="footer-privacy">Privacy</h3>
            <ul>
              <li>Codes are generated in your browser.</li>
              <li>Text, links and images are never uploaded.</li>
              <li>No accounts, analytics or tracking.</li>
            </ul>
          </section>
          <section aria-labelledby="footer-notes">
            <h3 id="footer-notes">Good to know</h3>
            <ul>
              <li>Logos are read and scaled on your device only.</li>
              <li>Test every code before you print or share it.</li>
              <li>Reset clears the app, not your downloads or caches.</li>
            </ul>
          </section>
        </div>
        <div className="footer-bar">
          <span>© {new Date().getFullYear()} QR Code Generator</span>
          <span>Released under the MIT License</span>
          {REPO && (
            <a href={REPO} rel="noopener noreferrer">
              Project repository
            </a>
          )}
        </div>
      </div>
    </footer>
  );
}
