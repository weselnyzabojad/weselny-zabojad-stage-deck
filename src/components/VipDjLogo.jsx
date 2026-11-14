import { useState } from 'react';
import { resolveDjIdentityId } from '../lib/importantSongs';
import { vipDjById } from '../lib/vipDjs';
import BrandFrame from './BrandFrame';
import logoMark from '../assets/img/dj-vip/logo_mark.png';
import logoSzymoniak from '../assets/img/dj-vip/logo_szymoniak.png';

// Explicit imports let Vite fingerprint and emit both partner PNGs. The
// registry stays limited to the two known VIP DJ identities.
const LOGO_BY_ID = {
  dj_mark: logoMark,
  dj_szymoniak: logoSzymoniak,
};

export default function VipDjLogo({ wedding, vip = false, dj = null, className = '' }) {
  const [failedSrc, setFailedSrc] = useState(null);
  if (!vip) return null;
  const djId = resolveDjIdentityId(wedding);
  const record = dj ?? vipDjById(djId);
  const override = djId ? wedding?.providers?.dj?.[`${djId}LogoUrl`] ?? null : null;
  const src = override ?? record?.logoUrl ?? (djId ? LOGO_BY_ID[djId] : null);
  if (!src || !record || failedSrc === src) return null;

  return (
    <BrandFrame large className={`shrink-0 ${className}`}>
      <img
        src={src}
        alt={record.displayName}
        title={record.displayName}
        onError={() => setFailedSrc(src)}
        className="h-16 w-auto max-w-[220px] object-contain"
      />
    </BrandFrame>
  );
}
