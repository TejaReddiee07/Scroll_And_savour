import { useEffect, useRef, useState } from 'react';
import { useMotion } from '../../context/MotionContext';
import { cx } from '../../lib/format';

/**
 * A real photograph on black that emerges from drifting fog when it first comes into view
 * (and once it has decoded — so there is never a half-loaded pop-in).
 *
 * photo: { src, srcset, width, height, color } from photos.generated.json (or an upload)
 * strong: thicker, slower fog (dish detail, lightbox)
 */
export default function Photo({
  photo,
  alt,
  sizes = '(max-width: 640px) 92vw, (max-width: 1280px) 46vw, 420px',
  className = '',
  imgClassName = '',
  priority = false,
  strong = false,
  fit = 'cover',
  reveal = true,
  ...rest
}) {
  const { still } = useMotion();
  const wrap = useRef(null);
  const img = useRef(null);
  const [inView, setInView] = useState(priority);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (priority || inView) return undefined;
    const el = wrap.current;
    if (!el) return undefined;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { rootMargin: '120px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [priority, inView]);

  useEffect(() => {
    const el = img.current;
    if (el?.complete && el.naturalWidth) setLoaded(true);
  }, [photo?.src]);

  if (!photo) return null;
  const isIn = loaded && inView;
  const fog = reveal && !still;

  return (
    <div
      ref={wrap}
      className={cx('fog-wrap', isIn && 'is-in', strong && 'fog-strong', !fog && 'fog-off', className)}
      style={{ backgroundColor: '#000' }}
      {...rest}
    >
      <img
        ref={img}
        src={photo.src}
        srcSet={photo.srcset}
        sizes={sizes}
        alt={alt}
        width={photo.width}
        height={photo.height}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : undefined}
        decoding="async"
        draggable="false"
        onLoad={() => setLoaded(true)}
        data-dish-art=""
        className={cx('fog-img h-full w-full', fit === 'contain' ? 'object-contain' : 'object-cover', imgClassName)}
      />
      {fog && (
        <span className="fog" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
          <i />
        </span>
      )}
    </div>
  );
}
