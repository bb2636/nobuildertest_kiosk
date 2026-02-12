import { useEffect, useRef, useState } from 'react';
import { resolveApiImageUrl } from '../../utils/resolveApiImageUrl';

type ApiImageProps = React.ImgHTMLAttributes<HTMLImageElement> & {
  /** API/DB에서 오는 URL (localhost, 상대경로 포함). resolveApiImageUrl로 변환 후 blob으로 로드 */
  src: string | null | undefined;
};

/**
 * WebView 등에서 이미지 로딩 실패 시 사용.
 * fetch → blob → URL.createObjectURL()로 로드하여 동일 오리진 이슈를 피함.
 */
export function ApiImage({ src, alt = '', ...rest }: ApiImageProps) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const resolved = resolveApiImageUrl(src);
  const createdUrlRef = useRef<string | null>(null);

  useEffect(() => {
    setFailed(false);
    setObjectUrl(null);
    if (!resolved) return;
    let cancelled = false;
    fetch(resolved, { mode: 'cors' })
      .then((res) => (res.ok ? res.blob() : Promise.reject(new Error('Image fetch failed'))))
      .then((blob) => {
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        createdUrlRef.current = url;
        setObjectUrl(url);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
      if (createdUrlRef.current) {
        URL.revokeObjectURL(createdUrlRef.current);
        createdUrlRef.current = null;
      }
    };
  }, [resolved]);

  if (!resolved || failed) {
    return <span className={rest.className} aria-hidden />;
  }

  if (objectUrl) {
    return <img {...rest} src={objectUrl} alt={alt} onError={() => setFailed(true)} />;
  }

  return <img {...rest} src={resolved} alt={alt} onError={() => setFailed(true)} />;
}
