import Image from 'next/image';
import Link from 'next/link';

const SIZES = {
  sm: { width: 120, height: 40, className: 'h-8 w-auto' },
  md: { width: 160, height: 53, className: 'h-10 w-auto' },
  lg: { width: 200, height: 67, className: 'h-14 w-auto' },
  auth: { width: 180, height: 60, className: 'h-12 w-auto' },
};

/**
 * ResiSure brand logo — house, shield, padlock mark on brand blue.
 */
export default function Logo({
  size = 'md',
  href = '/',
  className = '',
  priority = false,
  onClick,
}) {
  const dims = SIZES[size] || SIZES.md;
  const img = (
    <Image
      src="/logo.png"
      alt="ResiSure"
      width={dims.width}
      height={dims.height}
      className={`${dims.className} ${className}`.trim()}
      priority={priority}
    />
  );

  if (href) {
    return (
      <Link href={href} onClick={onClick} className="inline-flex shrink-0 items-center">
        {img}
      </Link>
    );
  }

  return img;
}
