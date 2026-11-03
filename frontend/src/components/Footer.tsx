const REPO = import.meta.env.VITE_REPO_URL;

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="wrap">
        <p>
          Privacy: QR codes are generated in your browser. The app does not use accounts, analytics or storage. It clears its own
          working data on reset, but cannot erase downloads, screenshots or browser and operating-system caches.
        </p>
        <p>Logo images are read and scaled locally for the code only; they are not uploaded.</p>
        {REPO && (
          <p>
            <a href={REPO} rel="noopener noreferrer">
              Project repository and README
            </a>
          </p>
        )}
      </div>
    </footer>
  );
}
