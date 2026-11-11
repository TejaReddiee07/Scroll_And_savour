import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Search, X, AlertTriangle, ExternalLink } from 'lucide-react';
import DishCard from '../components/menu/DishCard';
import PeekChef from '../components/scenes/PeekChef';
import { Seo } from '../components/ui';
import { PageHero } from '../components/fx';
import { useSiteData } from '../context/SiteDataContext';
import { track } from '../context/ConsentContext';
import { SITE } from '../data/site';
import { cx } from '../lib/format';

export const FILTERS = [
  { id: 'vegetarian', label: 'Vegetarian (V)', test: (i) => i.dietary.includes('vegetarian') || i.dietary.includes('vegan') },
  { id: 'vegan', label: 'Vegan (VG)', test: (i) => i.dietary.includes('vegan') },
  { id: 'gluten-free', label: 'Gluten-free (GF)', test: (i) => i.dietary.includes('gluten-free') },
  { id: 'spicy', label: 'Spicy', test: (i) => i.tags.includes('spicy') },
  { id: 'popular', label: 'Popular', test: (i) => i.tags.includes('popular') },
  { id: 'chefs-pick', label: "Chef's pick", test: (i) => i.tags.includes('chefs-pick') },
];

export function useMenuFilter(categories) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState([]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const tests = FILTERS.filter((f) => active.includes(f.id));
    return categories
      .map((c) => ({
        ...c,
        items: c.items.filter((i) => {
          const item = { dietary: [], tags: [], ...i };
          if (tests.some((t) => !t.test(item))) return false;
          if (!q) return true;
          return `${i.name} ${i.description} ${c.name}`.toLowerCase().includes(q);
        }),
      }))
      .filter((c) => c.items.length);
  }, [categories, query, active]);
  const toggle = (id) => setActive((a) => (a.includes(id) ? a.filter((x) => x !== id) : [...a, id]));
  const count = filtered.reduce((n, c) => n + c.items.length, 0);
  return { query, setQuery, active, toggle, clear: () => { setQuery(''); setActive([]); }, filtered, count };
}

export function MenuFilters({ f, className = '' }) {
  return (
    <div className={className}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-cream/50" size={18} aria-hidden="true" />
        <label htmlFor="menu-search" className="sr-only">Search the menu</label>
        <input
          id="menu-search"
          type="search"
          value={f.query}
          onChange={(e) => f.setQuery(e.target.value)}
          placeholder="Search dishes, e.g. salmon, ramen, katsu…"
          className="field !rounded-full !pl-11 !pr-11"
          autoComplete="off"
        />
        {f.query && (
          <button type="button" onClick={() => f.setQuery('')} className="absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-cream/60 hover:text-white" aria-label="Clear search">
            <X size={16} />
          </button>
        )}
      </div>
      <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Dietary filters">
        {FILTERS.map((x) => (
          <button key={x.id} type="button" className="chip" aria-pressed={f.active.includes(x.id)} onClick={() => f.toggle(x.id)}>
            {x.label}
          </button>
        ))}
        {(f.active.length > 0 || f.query) && (
          <button type="button" onClick={f.clear} className="chip !border-transparent text-gold-soft underline underline-offset-4">
            Clear all
          </button>
        )}
      </div>
      <p className="mt-2 text-xs text-cream/55" aria-live="polite">
        Showing {f.count} item{f.count === 1 ? '' : 's'}. Labels are as published by the restaurant — always confirm allergens with staff.
      </p>
    </div>
  );
}

export function AllergenNotice({ className = '' }) {
  const { allergenNotice } = useSiteData();
  return (
    <aside id="allergens" className={cx('flex gap-3 rounded-2xl border border-hair bg-ink-3 p-4 text-sm text-cream/75', className)} aria-label="Allergen information">
      <AlertTriangle className="mt-0.5 shrink-0 text-gold" size={20} aria-hidden="true" />
      <p>
        <strong className="text-cream">Allergens:</strong> {allergenNotice}{' '}
        <Link to="/allergens" className="underline decoration-gold underline-offset-2">More information</Link>
      </p>
    </aside>
  );
}

export default function Menu() {
  const { categories } = useSiteData();
  const f = useMenuFilter(categories);
  const [activeSlug, setActiveSlug] = useState(categories[0]?.slug);
  const [waveKey, setWaveKey] = useState(null);
  const [highlight, setHighlight] = useState(null);
  const barRef = useRef(null);
  const location = useLocation();
  const programmatic = useRef(false);

  useEffect(() => track('menu_view'), []);

  // active category follows scroll position
  useEffect(() => {
    const sections = [...document.querySelectorAll('[data-menu-section]')];
    const io = new IntersectionObserver(
      (entries) => {
        if (programmatic.current) return;
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActiveSlug(visible.target.dataset.menuSection);
      },
      { rootMargin: '-35% 0px -55% 0px' },
    );
    sections.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, [f.filtered]);

  // chef waves + active chip scrolls into view when the category changes
  useEffect(() => {
    setWaveKey(activeSlug);
    const bar = barRef.current;
    const chip = bar?.querySelector(`[data-chip="${activeSlug}"]`);
    if (bar && chip) bar.scrollTo({ left: chip.offsetLeft - bar.clientWidth / 2 + chip.clientWidth / 2, behavior: 'smooth' });
  }, [activeSlug]);

  // deep links: /menu#chicken-katsu-curry or /menu#ramen
  useEffect(() => {
    const id = decodeURIComponent(location.hash.slice(1));
    if (!id) return undefined;
    const t = setTimeout(() => {
      const el = document.getElementById(id) || document.getElementById(`cat-${id}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setHighlight(id);
        setTimeout(() => setHighlight(null), 2600);
      }
    }, 450);
    return () => clearTimeout(t);
  }, [location.hash]);

  const jumpTo = (slug) => {
    const el = document.getElementById(`cat-${slug}`);
    if (!el) return;
    programmatic.current = true;
    setActiveSlug(slug);
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => {
      programmatic.current = false;
    }, 900);
  };

  return (
    <>
      <Seo
        title="Menu"
        description="Fuji's full menu with prices: starters, maki, uramaki, sashimi, ramen, udon & soba, katsu curry, bento, nigiri, temaki, desserts, Japanese beers and sake. Vegetarian, vegan and gluten-free labels shown."
        path="/menu"
      />
      <PageHero num="04" label="The menu" jp="品書" title="Made for" em="the whole table.">
        Every dish and price from the restaurant&apos;s published menu — {categories.reduce((n, c) => n + c.items.length, 0)} items across{' '}
        {categories.length} sections. Prices in GBP and subject to change.
      </PageHero>
      <div className="container-x -mt-4 mb-10 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <MenuFilters f={f} />
        <AllergenNotice />
      </div>

      {/* sticky category bar with the peeking chef */}
      <div className="sticky top-0 z-30 border-y border-hair bg-ink/85 backdrop-blur-xl transition-[top] duration-500 [html.header-shown_&]:top-16 md:[html.header-shown_&]:top-20">
        <div className="container-x relative flex items-center">
          <nav ref={barRef} aria-label="Menu categories" className="no-scrollbar flex flex-1 gap-2 overflow-x-auto py-3 pr-24">
            {f.filtered.map((c) => (
              <a
                key={c.slug}
                href={`#cat-${c.slug}`}
                data-chip={c.slug}
                onClick={(e) => {
                  e.preventDefault();
                  jumpTo(c.slug);
                }}
                className={cx('chip shrink-0', activeSlug === c.slug && 'is-active')}
                aria-current={activeSlug === c.slug ? 'true' : undefined}
              >
                {c.name}
                <span className="text-xs opacity-60">{c.items.length}</span>
              </a>
            ))}
          </nav>
          <div className="pointer-events-none absolute bottom-0 right-0 h-full w-28 bg-gradient-to-l from-ink via-ink/80 to-transparent" />
          <PeekChef trigger={waveKey} className="pointer-events-none absolute -bottom-px right-2 h-[74px] w-[74px] sm:right-4" />
        </div>
      </div>

      <div className="container-x pb-24 pt-10">
        {f.filtered.length === 0 && (
          <div className="py-24 text-center">
            <p className="font-display text-2xl text-cream">No dishes match those filters.</p>
            <button type="button" onClick={f.clear} className="btn btn-outline mt-6">Clear filters</button>
          </div>
        )}
        {f.filtered.map((c) => (
          <section key={c.slug} id={`cat-${c.slug}`} data-menu-section={c.slug} className="scroll-mt-40 py-10" aria-labelledby={`h-${c.slug}`}>
            <div className="relative mb-8 flex flex-wrap items-end justify-between gap-4 overflow-x-clip">
              <span aria-hidden="true" className="kanji-watermark -top-8 right-0 !text-[5.5rem] text-cream sm:!text-[7rem]">{c.jp}</span>
              <div className="relative">
                <p className="mono text-xs uppercase tracking-[0.2em] text-saffron">{String(categories.findIndex((x) => x.slug === c.slug) + 1).padStart(2, '0')} · {c.items.length} items</p>
                <h2 id={`h-${c.slug}`} className="mt-2 text-[clamp(2.2rem,4.4vw,3.6rem)] text-cream">
                  {c.name} <span className="jp ml-2 text-xl text-saffron/80">{c.jp}</span>
                </h2>
                {c.intro && <p className="mt-3 max-w-2xl text-cream/70">{c.intro}</p>}
              </div>
              {c.note && (
                <p className="mono relative max-w-sm rounded-xl border border-dashed border-saffron/40 px-4 py-2 text-[0.72rem] uppercase tracking-[0.1em] text-saffron-2">
                  <AlertTriangle size={14} className="mr-1.5 inline -translate-y-px" aria-hidden="true" />
                  {c.note}
                </p>
              )}
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {c.items.map((item) => (
                <DishCard key={item.id} item={item} highlight={highlight === item.id} />
              ))}
            </div>
          </section>
        ))}
        <p className="mt-6 text-center text-sm text-cream/55">
          Menu transcribed from the restaurant&apos;s published menu (snapshot 10 Nov 2026). The live menu is at{' '}
          <a href={SITE.links.officialMenu} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline">
            fujirestaurant.co.uk/menu <ExternalLink size={12} />
          </a>
          .
        </p>
      </div>
    </>
  );
}
