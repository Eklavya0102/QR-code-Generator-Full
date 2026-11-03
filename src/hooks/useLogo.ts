import { useCallback, useEffect, useRef, useState } from 'react';
import { validateImageFile } from '../lib/validate';

export interface Logo {
  id: number;
  url: string;
  name: string;
  img: HTMLImageElement;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => (img.width > 0 && img.height > 0 ? resolve(img) : reject(new Error('empty')));
    img.onerror = () => reject(new Error('decode'));
    img.src = url;
  });
}

/** Holds the chosen logo in memory only and revokes its object URL on replace, remove and unmount. */
export function useLogo() {
  const [logo, setLogo] = useState<Logo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const urlRef = useRef<string | null>(null);
  const counter = useRef(0);

  const release = useCallback(() => {
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
  }, []);

  useEffect(() => release, [release]);

  const select = useCallback(
    async (file: File): Promise<boolean> => {
      setError(null);
      const check = await validateImageFile(file);
      if (!check.ok) {
        setError(check.error);
        return false;
      }
      const url = URL.createObjectURL(file);
      try {
        const img = await loadImage(url);
        release();
        urlRef.current = url;
        setLogo({ id: ++counter.current, url, name: file.name, img });
        return true;
      } catch {
        URL.revokeObjectURL(url);
        setError('This image could not be decoded. It may be corrupt. Try another file.');
        return false;
      }
    },
    [release],
  );

  const remove = useCallback(() => {
    release();
    setLogo(null);
    setError(null);
  }, [release]);

  return { logo, error, select, remove };
}
