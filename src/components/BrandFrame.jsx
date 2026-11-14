import { BRAND_FRAME, BRAND_FRAME_LARGE } from '../lib/topBarStyles.js';

// Shared desktop header frame for every brand mark: the primary Weselny
// Żabojad logo and the assigned VIP DJ partner logo. The `large` variant gives
// co-branding more visual weight without changing the primary logo.
export default function BrandFrame({ children, className = '', large = false }) {
  return (
    <div className={`${large ? BRAND_FRAME_LARGE : BRAND_FRAME} ${className}`}>
      {children}
    </div>
  );
}
