import logo from '../assets/img/logo.png';
import BrandFrame from './BrandFrame';

// Primary desktop brand mark. The shared frame keeps it visually matched with
// the partner DJ logos on the opposite side of the header.
export default function TopBarLogo({ className = '', imgClassName = '' }) {
  return (
    <BrandFrame className={className}>
      <img
        src={logo}
        alt="Weselny Żabojad"
        className={`h-12 w-auto object-contain ${imgClassName}`}
      />
    </BrandFrame>
  );
}
