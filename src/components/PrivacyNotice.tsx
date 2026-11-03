import { Lock } from 'lucide-react';

export function PrivacyNotice() {
  return (
    <p className="privacy-note">
      <Lock size={14} aria-hidden="true" />
      Your text, links and images stay in this browser tab and are never sent to a server.
    </p>
  );
}
