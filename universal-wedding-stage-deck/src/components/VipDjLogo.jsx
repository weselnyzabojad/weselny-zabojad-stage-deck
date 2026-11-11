import { resolveDjIdentityId } from '../lib/importantSongs';
import { vipDjById } from '../lib/vipDjs';
import BrandFrame from './BrandFrame';

// Eager glob keeps the build safe if the owner has not added one of the PNGs
// yet: a missing asset simply resolves to no logo.
const LOGOS = import.meta.glob('../assets/img/dj-vip/*.png', {
  eager: true,
  import: 'default',
});

const LOGO_BY_ID = {
  dj_mark: LOGOS['../assets/img/dj-vip/logo_mark.png'],
  dj_szymoniak: LOGOS['../assets/img/dj-vip/logo_szymoniak.png'],
};

export default function VipDjLogo({ wedding, vip = false, className = '' }) {
  if (!vip) return null;
  const djId = resolveDjIdentityId(wedding);
  const dj = vipDjById(djId);
  const src = djId ? LOGO_BY_ID[djId] : null;
  if (!src || !dj) return null;

  return (
    <BrandFrame large className={`shrink-0 ${className}`}>
      <img
        src={src}
        alt={dj.displayName}
        title={dj.displayName}
        className="h-16 w-auto max-w-[220px] object-contain"
      />
    </BrandFrame>
  );
}
