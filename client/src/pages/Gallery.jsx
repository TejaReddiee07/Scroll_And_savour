import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Seo } from '../components/ui';
import { TiltCard } from '../components/effects/Interactions';
import { PageHero } from '../components/fx';
import Photo from '../components/media/Photo';
import { useSiteData } from '../context/SiteDataContext';
import { useMotion } from '../context/MotionContext';
import { photoFor, PLACES, INSTAGRAM } from '../data/photos';
import { lockScroll } from '../lib/smooth';
import { formatGBP, cx } from '../lib/format';

const DISH_GROUPS = {
  Sushi: ['rainbow-roll', 'fuji-roll', 'california-roll', 'king-prawn-eel-dragon-roll', 'salmon-nigiri', 'spider-roll', 'fuji-delux-platter', 'nigiri-set', 'fuji-mix-platter', 'salmon-avocado-temaki'],
  Sashimi: ['delux-sashimi', 'salmon-sashimi', 'tuna-sashimi', 'mix-sashimi', 'sea-bass-sashimi'],
  'Hot dishes': ['chicken-katsu-curry', 'prawn-tempura', 'chicken-karage', 'mixed-tempura', 'unaju-eel-fish', 'mixed-starter-platter', 'chicken-gyoza', 'yakiniku-steak'],
  'Ramen & noodles': ['miso-ramen', 'kimchi-ramen', 'prawn-tempura-soba-soup', 'soya-ramen', 'kitsune-udon'],
  Bento: ['sirloin-steak-bento', 'sushi-bento', 'chicken-karage-bento', 'vegetable-bento'],
};
const PLACE_ENTRIES = [
  { key: 'storefront', group: 'Restaurant', title: 'Our shopfront on Stoke Newington Church Street' },
  { key: 'interior', group: 'Restaurant', title: 'Inside Fuji' },
  { key: 'hero-sushi-platter', group: 'Restaurant', title: 'Sushi & sashimi platter' },
  { key: 'catering-sushi-platter', group: 'Restaurant', title: 'Catering platter' },
];
const ASPECTS = ['aspect-[4/5]', 'aspect-[4/3]', 'aspect-square', 'aspect-[3/4]', 'aspect-[3/2]'];

function Tile({ entry, aspect, onOpen }) {
  return (
    <TiltCard className="group mb-5 break-inside-avoid overflow-hidden rounded-[18px] border border-hair bg-black" max={5}>
      <button type="button" onClick={onOpen} data-cursor="View" className="relative block w-full text-left">
        <span className="sr-only">Open image: </span>
        <Photo photo={entry.photo} alt={entry.title} className={cx('w-full', aspect)} sizes="(max-width: 640px) 92vw, (max-width: 1024px) 46vw, 420px" />
        <span className="pointer-events-none absolute inset-x-0 bottom-0 z-[4] bg-gradient-to-t from-black/85 via-black/30 to-transparent p-5 pt-16 opacity-0 transition-opacity duration-500 group-hover:opacity-100 group-focus-visible:opacity-100">
          <span className="display block text-xl text-white">{entry.title}</span>
          <span className="mono text-[0.68rem] uppercase tracking-[0.16em] text-white/70">
            {entry.group}
            {entry.item ? ` · ${formatGBP(entry.item.price)}` : ''}
          </span>
        </span>
      </button>
    </TiltCard>
  );
}

function Lightbox({ entries, index, onClose, onIndex }) {
  const { still } = useMotion();
  const entry = entries[index];
  const ref = useRef(null);
  const start = useRef(null);
  const go = useCallback((d) => onIndex((index + d + entries.length) % entries.length), [index, entries.length, onIndex]);

  useEffect(() => {
    const prev = document.activeElement;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
      if (e.key === 'Tab') {
        const f = ref.current?.querySelectorAll('button, a[href]');
        if (!f?.length) return;
        if (e.shiftKey && document.activeElement === f[0]) {
          e.preventDefault();
          f[f.length - 1].focus();
        } else if (!e.shiftKey && document.activeElement === f[f.length - 1]) {
          e.preventDefault();
          f[0].focus();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    lockScroll(true);
    ref.current?.querySelector('button')?.focus();
    return () => {
      window.removeEventListener('keydown', onKey);
      lockScroll(false);
      prev?.focus?.();
    };
  }, [go, onClose]);

  // preload neighbours so swiping feels instant
  useEffect(() => {
    [entries[(index + 1) % entries.length], entries[(index - 1 + entries.length) % entries.length]].forEach((e) => {
      if (!e?.photo) return;
      const img = new Image();
      img.sizes = '100vw';
      img.srcset = e.photo.srcset;
      img.src = e.photo.src;
    });
  }, [index, entries]);

  return (
    <motion.div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-label={`Gallery: ${entry.title}`}
      data-lenis-prevent=""
      className="fixed inset-0 z-[80] flex flex-col bg-black"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: still ? 0 : 0.4 }}
      onPointerDown={(e) => {
        start.current = e.clientX;
      }}
      onPointerUp={(e) => {
        if (start.current == null) return;
        const dx = e.clientX - start.current;
        start.current = null;
        if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
      }}
    >
      <div className="flex items-center justify-between p-4 text-cream">
        <p className="mono text-xs tracking-[0.2em] text-cream/70" aria-live="polite">
          {String(index + 1).padStart(2, '0')} / {String(entries.length).padStart(2, '0')}
        </p>
        <button type="button" onClick={onClose} className="grid h-11 w-11 place-items-center rounded-full border border-hair" aria-label="Close gallery">
          <X size={20} />
        </button>
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center px-4 sm:px-20">
        <button type="button" onClick={() => go(-1)} className="absolute left-3 z-10 grid h-12 w-12 place-items-center rounded-full border border-hair bg-black/50 text-white hover:border-saffron sm:left-6" aria-label="Previous image">
          <ChevronLeft size={22} />
        </button>
        <AnimatePresence mode="wait">
          <motion.figure
            key={entry.id}
            className="flex h-full w-full max-w-[1800px] flex-col"
            initial={{ opacity: 0, scale: still ? 1 : 1.02 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: still ? 0 : 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="relative min-h-0 flex-1">
              <Photo photo={entry.photo} alt={entry.title} sizes="100vw" fit="contain" strong priority className="absolute inset-0 h-full w-full" />
            </div>
            <figcaption className="flex flex-wrap items-center justify-between gap-3 py-4 text-cream">
              <span>
                <span className="display block text-2xl">{entry.title}</span>
                <span className="mono text-[0.68rem] uppercase tracking-[0.16em] text-cream/60">
                  {entry.group}
                  {entry.item ? ` · ${formatGBP(entry.item.price)}` : ''} · {entry.photo.width} × {entry.photo.height}px
                </span>
              </span>
              {entry.item && (
                <Link to={`/menu#${entry.item.id}`} onClick={onClose} className="btn btn-primary btn-sm">View on menu</Link>
              )}
            </figcaption>
          </motion.figure>
        </AnimatePresence>
        <button type="button" onClick={() => go(1)} className="absolute right-3 z-10 grid h-12 w-12 place-items-center rounded-full border border-hair bg-black/50 text-white hover:border-saffron sm:right-6" aria-label="Next image">
          <ChevronRight size={22} />
        </button>
      </div>
    </motion.div>
  );
}

export default function Gallery() {
  const { getItem } = useSiteData();
  const [tab, setTab] = useState('All');
  const [open, setOpen] = useState(null);

  const all = useMemo(() => {
    const dishes = Object.entries(DISH_GROUPS).flatMap(([group, ids]) =>
      ids
        .map((id) => ({ id, item: getItem(id), photo: photoFor(id) }))
        .filter((e) => e.item && e.photo)
        .map((e) => ({ ...e, group, title: e.item.name })),
    );
    const places = PLACE_ENTRIES.filter((p) => PLACES[p.key]).map((p) => ({ id: p.key, group: p.group, title: p.title, photo: PLACES[p.key] }));
    const insta = INSTAGRAM.map((p, i) => ({ id: p.id, group: 'Instagram', title: `From Fuji's Instagram (${i + 1})`, photo: p }));
    return [...dishes, ...places, ...insta];
  }, [getItem]);

  const tabs = useMemo(() => ['All', ...new Set(all.map((e) => e.group))], [all]);
  const entries = tab === 'All' ? all : all.filter((e) => e.group === tab);

  return (
    <>
      <Seo title="Food gallery" description="Photographs of Fuji's sushi, sashimi, ramen, bento and hot dishes, the dining room and the shopfront on Stoke Newington Church Street." path="/gallery" />
      <PageHero num="—" label="Gallery" jp="写真" title="Look" em="before you eat.">
        {all.length} photographs from Fuji&apos;s kitchen and dining room. Tap any photo to see it full screen.
      </PageHero>
      <section className="pb-24">
        <div className="container-x">
          <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-2" role="tablist" aria-label="Gallery filters">
            {tabs.map((t) => (
              <button key={t} type="button" role="tab" aria-selected={tab === t} className="chip shrink-0" onClick={() => setTab(t)}>
                {t}
              </button>
            ))}
          </div>
          <div className="mt-8 columns-1 gap-5 sm:columns-2 lg:columns-3" role="tabpanel" aria-label={`${tab} photos`}>
            {entries.map((e, i) => (
              <Tile key={`${tab}-${e.id}`} entry={e} aspect={ASPECTS[i % ASPECTS.length]} onOpen={() => setOpen(i)} />
            ))}
          </div>
        </div>
      </section>
      <AnimatePresence>
        {open != null && entries[open] && <Lightbox entries={entries} index={open} onIndex={setOpen} onClose={() => setOpen(null)} />}
      </AnimatePresence>
    </>
  );
}
