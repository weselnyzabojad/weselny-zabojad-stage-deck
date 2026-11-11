import { BRAND_FRAME } from '../lib/topBarStyles.js';

// Shared desktop header frame for every brand mark: the primary Weselny
// Żabojad logo and the assigned VIP DJ partner logo. Keeping the frame in one
// place prevents the left and right branding surfaces from drifting apart.
export default function BrandFrame({ children, className = '' }) {
  return <div className={`${BRAND_FRAME} ${className}`}>{children}</div>;
}
