import { useRef, useState, type DragEvent } from 'react';
import { CircleCheck, ImagePlus, X } from 'lucide-react';
import type { Logo } from '../hooks/useLogo';

interface Props {
  logo: Logo | null;
  error: string | null;
  /** Confirmation shown after the logo is added, replaced or removed. */
  notice?: string;
  onSelect: (file: File) => void;
  onRemove: () => void;
}

export function ImageUpload({ logo, error, notice, onSelect, onRemove }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  const pick = (file?: File | null) => {
    if (file) onSelect(file);
    if (input.current) input.current.value = '';
  };
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    pick(e.dataTransfer.files?.[0]);
  };

  return (
    <div className="field">
      <span className="label" id="logo-label">
        Logo (optional)
      </span>
      {logo ? (
        <div className="logo-row">
          <img src={logo.url} alt="Selected logo preview" />
          <div className="logo-name">
            <strong>{logo.name}</strong>
            <span>Scaled and centered locally</span>
          </div>
          <button type="button" className="btn ghost" onClick={() => input.current?.click()}>
            Replace
          </button>
          <button type="button" className="icon-btn" onClick={onRemove} aria-label="Remove image">
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      ) : (
        <div
          className={over ? 'drop over' : 'drop'}
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={onDrop}
        >
          <ImagePlus size={22} aria-hidden="true" />
          <p>Drop an image here, or</p>
          <button type="button" className="btn ghost" onClick={() => input.current?.click()}>
            Browse files
          </button>
          <small>PNG, JPEG or WebP, up to 1 MiB</small>
        </div>
      )}
      <input
        ref={input}
        className="visually-hidden"
        type="file"
        accept="image/png,image/jpeg,image/webp"
        aria-labelledby="logo-label"
        tabIndex={-1}
        onChange={(e) => pick(e.target.files?.[0])}
      />
      {error && (
        <p className="msg error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="msg ok with-icon" role="status">
          <CircleCheck size={16} aria-hidden="true" /> {notice}
        </p>
      )}
      {logo && (
        <p className="msg warn">A logo covers part of the code and can reduce scannability. Use error correction Q or H and test the result.</p>
      )}
    </div>
  );
}
