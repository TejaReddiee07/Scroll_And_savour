import { Minus, Plus } from 'lucide-react';
import { Steam } from '../effects/Interactions';
import Photo from '../media/Photo';
import { photoFor } from '../../data/photos';
import { DIETARY, TAGS } from '../../data/site';
import { cx } from '../../lib/format';
import { uploadedPhoto } from '../../lib/media';

export { cdn } from '../../lib/media';

/* Section title with eyebrow, brush underline and a giant faded kanji watermark */
export function SectionTitle({ eyebrow, title, kanji, children, align = 'left', light = false, className = '', as: H = 'h2', id }) {
  const center = align === 'center';
  return (
    <div className={cx('relative', center && 'text-center', className)}>
      {kanji && (
        <span
          aria-hidden="true"
          className={cx('kanji-watermark -top-10 text-cream sm:-top-14', center ? 'left-1/2 -translate-x-1/2' : 'right-0')}
        >
          {kanji}
        </span>
      )}
      <div className="relative">
        {eyebrow && <p className="eyebrow"><b>—</b> {eyebrow}</p>}
        <H id={id} className="mt-5 text-balance text-[clamp(2.2rem,4.6vw,4.2rem)] text-cream">
          {title}
        </H>
        {children && (
          <div className={cx('mt-4 max-w-2xl text-base text-cream/70 sm:text-lg', center && 'mx-auto')}>
            {children}
          </div>
        )}
      </div>
    </div>
  );
}

/** Photo object for an item: the owner's upload (admin) → real Fuji photo → null. */
export function dishPhoto(item) {
  return uploadedPhoto(item?.image) ?? photoFor(item?.id);
}

/**
 * Dish visual on black: the real photograph when there is one (emerging from fog),
 * otherwise the dish illustration with a small "Illustration" tag.
 */
export function DishImage({
  item,
  className = '',
  artClassName = 'h-full w-full',
  steam = true,
  sizes,
  labelClassName = '',
  compactLabel = false,
  priority = false,
  strong = false,
  steamAlways = false,
  variant = 'cutout',
  float = false,
}) {
  const photo = dishPhoto(item);
  // Real food cut out of its background, on black (default for dishes)
  if (photo?.cutout && variant === 'cutout') {
    return (
      <div className={cx('dish-cut', float && 'dish-float', className)}>
        <span className="dish-spot" aria-hidden="true" />
        <span className="dish-floor" aria-hidden="true" />
        <div className="dish-food">
          <Photo
            photo={photo.cutout}
            alt={`${item.name} — Fuji Japanese Restaurant`}
            sizes={sizes}
            priority={priority}
            strong={strong}
            fit="contain"
            className="h-full w-full"
          />
        </div>
        {photo.illustrative && (
          <span className={cx('label-illustrative z-[4]', compactLabel && '!bottom-1 !left-1 !px-1.5 !py-0 !text-[8px]', labelClassName)}>
            {compactLabel ? 'Illustrative' : 'Illustrative image'}
          </span>
        )}
        {steam && item?.hot && (steamAlways ? <SteamRise /> : <Steam />)}
      </div>
    );
  }
  if (photo) {
    return (
      <div className={cx('relative overflow-hidden bg-black', className)}>
        <Photo photo={photo} alt={`${item.name} — Fuji Japanese Restaurant`} sizes={sizes} priority={priority} strong={strong} className="h-full w-full" />
        {photo.illustrative && (
          <span className={cx('label-illustrative', compactLabel && '!bottom-1 !left-1 !px-1.5 !py-0 !text-[8px]', labelClassName)}>Illustrative image</span>
        )}
        {steam && item?.hot && (steamAlways ? <SteamRise /> : <Steam />)}
      </div>
    );
  }
  // No photo yet: an intentional black tile (never a cartoon next to real photos)
  return <NoPhotoTile item={item} className={className} compact={compactLabel} />;
}

const KANJI = {
  dorayaki: '甘', mochi: '甘', icecream: '甘', stirfry: '麺', ramen: '麺', noodlesoup: '麺', drink: '飲', beer: '酒', sake: '酒',
  bento: '弁', donburi: '丼', chirashi: '寿', nigiri: '寿', gunkan: '寿', temaki: '寿', maki: '寿', uramaki: '寿', futomaki: '寿',
  friedrice: '飯', salad: '菜', soup: '汁', curry: '飯', grill: '焼', side: '品', sashimi: '刺', set: '寿',
};

export function NoPhotoTile({ item, className = '', compact = false }) {
  const kanji = KANJI[String(item?.art || '').split(':')[0]] || '食';
  return (
    <div className={cx('@container relative grid place-items-center overflow-hidden bg-black', className)} role="img" aria-label={`${item?.name ?? 'Dish'} — photo coming soon`}>
      <span aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_55%_45%_at_50%_52%,rgba(240,160,50,.12),transparent_72%)]" />
      <span aria-hidden="true" className="jp relative text-[46cqw] leading-none text-cream/[0.09]">{kanji}</span>
      {!compact && (
        <span className="mono absolute bottom-[8%] left-1/2 -translate-x-1/2 whitespace-nowrap text-[0.58rem] uppercase tracking-[0.22em] text-cream/45">Photo coming soon</span>
      )}
    </div>
  );
}

export function SteamRise() {
  return (
    <span className="steam-rise" aria-hidden="true">
      <span />
      <span />
      <span />
    </span>
  );
}

export function DietaryBadges({ dietary = [], tags = [], className = '', size = 'sm' }) {
  if (!dietary.length && !tags.length) return null;
  const pad = size === 'xs' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-[11px]';
  return (
    <ul className={cx('flex flex-wrap gap-1.5', className)} aria-label="Dietary labels and tags">
      {dietary.map((d) =>
        DIETARY[d] ? (
          <li key={d} title={DIETARY[d].label} className={cx('rounded-full font-bold tracking-wide', pad, DIETARY[d].className)}>
            <abbr title={DIETARY[d].label} className="no-underline">{DIETARY[d].short}</abbr>
            <span className="sr-only"> ({DIETARY[d].label})</span>
          </li>
        ) : null,
      )}
      {tags.map((t) =>
        TAGS[t] ? (
          <li key={t} className={cx('rounded-full font-semibold', pad, TAGS[t].className)}>
            {TAGS[t].label}
          </li>
        ) : null,
      )}
    </ul>
  );
}

export function QuantityStepper({ value, onChange, min = 1, max = 20, label = 'Quantity', dark = true, size = 'md' }) {
  const btn = cx(
    'grid place-items-center rounded-full transition-colors disabled:opacity-40',
    size === 'sm' ? 'h-7 w-7' : 'h-9 w-9',
    dark ? 'bg-white/8 hover:bg-white/15 text-cream' : 'bg-ink/6 hover:bg-ink/12 text-ink',
  );
  return (
    <div className="inline-flex items-center gap-1.5" role="group" aria-label={label}>
      <button type="button" className={btn} onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label={`Decrease ${label.toLowerCase()}`}>
        <Minus size={14} />
      </button>
      <output aria-live="polite" className={cx('min-w-6 text-center font-semibold tabular-nums', size === 'sm' && 'text-sm')}>
        {value}
      </output>
      <button type="button" className={btn} onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label={`Increase ${label.toLowerCase()}`}>
        <Plus size={14} />
      </button>
    </div>
  );
}

/* Per-page SEO (React 19 hoists these into <head>) */
export function Seo({ title, description, path = '/', image = '/og-image.png', noindex = false }) {
  const full = title ? `${title} · Fuji Japanese Restaurant, Stoke Newington` : 'Fuji Japanese Restaurant · Sushi & Japanese Food in Stoke Newington, London N16';
  const url = `${import.meta.env.VITE_SITE_URL || 'https://fujirestaurant.co.uk'}${path}`;
  return (
    <>
      <title>{full}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      <meta property="og:title" content={full} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={image} />
      <meta name="twitter:title" content={full} />
      <meta name="twitter:description" content={description} />
      {noindex && <meta name="robots" content="noindex" />}
    </>
  );
}

export function DemoBadge({ children = 'Demonstration', className = '' }) {
  return <span className={cx('demo-badge', className)}>{children}</span>;
}

export function Field({ label, error, children, hint, id, required }) {
  return (
    <div>
      <label htmlFor={id} className="field-label">
        {label}
        {required && <span className="text-fuji-red" aria-hidden="true"> *</span>}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs opacity-60">{hint}</p>}
      {error && (
        <p id={`${id}-error`} className="field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
