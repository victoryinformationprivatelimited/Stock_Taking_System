import { useEffect, useState } from 'react';

export function useImage(src: string | undefined): [HTMLImageElement | null, 'loading' | 'loaded' | 'failed'] {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [status, setStatus] = useState<'loading' | 'loaded' | 'failed'>('loading');

  useEffect(() => {
    if (!src) return;
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setImage(img);
      setStatus('loaded');
    };
    img.onerror = () => setStatus('failed');
    img.src = src;
  }, [src]);

  return [image, status];
}
