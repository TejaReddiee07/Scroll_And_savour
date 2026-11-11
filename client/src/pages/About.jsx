import { Link } from 'react-router-dom';
import { Fish, Soup, Leaf, HeartHandshake, ArrowRight } from 'lucide-react';
import HorizontalStory from '../components/scenes/HorizontalStory';
import { Seo, SectionTitle } from '../components/ui';
import { Reveal, RevealGroup, RevealItem, TiltCard } from '../components/effects/Interactions';
import { useSiteData } from '../context/SiteDataContext';
import chefImg from '../assets/characters/chef.webp';
import Photo from '../components/media/Photo';
import { PHOTOS } from '../data/photos';
import waiterImg from '../assets/characters/waiter.webp';

const VALUES = [
  { icon: Fish, title: 'Sushi & sashimi at the heart', text: 'Nigiri, gunkan, maki, uramaki, futo maki, temaki and sashimi — from a single salmon maki to the Fuji Delux Platter.' },
  { icon: Soup, title: 'Comforting hot dishes', text: 'Ramen, udon and soba, tempura, katsu curry, katsudon, bento boxes and stir-fried noodles.' },
  { icon: Leaf, title: 'Something for everyone', text: 'Dishes labelled vegetarian, vegan and gluten-free on the menu, plus a kids’ menu — always check allergens with staff.' },
  { icon: HeartHandshake, title: 'Neighbourhood hospitality', text: 'Dine in, collect, order delivery across nearby N16 neighbourhoods, or book catering for your event.' },
];

export default function About() {
  const { items, categories } = useSiteData();
  return (
    <>
      <Seo title="About us" description="About Fuji Japanese Restaurant on Stoke Newington Church Street — sushi, sashimi and comforting Japanese favourites in London N16." path="/about" />
      <section className="relative overflow-hidden pb-20 pt-32 sm:pt-40">
        <div className="container-x grid items-center gap-12 lg:grid-cols-[1.2fr_1fr]">
          <Reveal>
            <SectionTitle eyebrow="私たちについて · About us" title="A taste of Japan in the heart of Stoke Newington" kanji="物語" as="h1">
              <p>
                Fuji Japanese Restaurant is a Japanese restaurant at 15 Stoke Newington Church Street, in north-east London. Its menu of{' '}
                {items.length} dishes and drinks across {categories.length} sections covers sushi and sashimi, rolls, ramen, udon and soba,
                tempura, katsu curry, rice dishes, bento boxes and Japanese desserts — alongside soft drinks, Japanese beers and sake.
              </p>
              <p className="mt-4">The restaurant offers dine-in, collection, delivery, table booking and catering.</p>
            </SectionTitle>
            <div className="mt-8 rounded-2xl border border-dashed border-gold/40 bg-gold/5 p-5 text-sm text-cream/75">
              <p className="font-semibold text-gold-soft">Our history — awaiting the owner&apos;s words</p>
              <p className="mt-1">
                An establishment year of 2009 has been published. The founding story, the chefs and how Fuji would like its history told
                will be added here once confirmed by the owner.
              </p>
            </div>
          </Reveal>
          <Reveal delay={0.15} className="relative mx-auto flex items-end justify-center gap-2">
            <img src={waiterImg} alt="Illustrated waiter mascot (illustration, not a member of staff)" width="437" height="360" className="w-56 rounded-3xl bg-cream/95 px-2 pt-2 sm:w-64" />
            <img src={chefImg} alt="Illustrated chef mascot (illustration, not a member of staff)" width="195" height="342" className="h-64 w-auto rounded-3xl bg-cream/95 px-4 pt-3 sm:h-72" />
            <span className="absolute -top-4 left-4 rounded-full bg-fuji-red px-3 py-1 text-xs font-semibold text-white">Illustrated mascots</span>
          </Reveal>
        </div>
      </section>

      <HorizontalStory />

      <section className="washi py-24" aria-labelledby="values-title">
        <div className="container-x">
          <Reveal>
            <SectionTitle eyebrow="What Fuji is about" title="On the menu, every day" kanji="心" id="values-title" />
          </Reveal>
          <RevealGroup className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {VALUES.map((v) => (
              <RevealItem key={v.title}>
                <TiltCard className="card h-full p-6">
                  <v.icon className="text-fuji-red" size={30} aria-hidden="true" />
                  <h3 className="mt-4 display text-xl">{v.title}</h3>
                  <p className="mt-2 text-sm text-cream/70">{v.text}</p>
                </TiltCard>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </section>

      <section className="py-24" aria-labelledby="space-title">
        <div className="container-x">
          <Reveal>
            <SectionTitle eyebrow="The space" title="Inside & outside" kanji="店" id="space-title">
              <p>The dining room and the shopfront at 15 Stoke Newington Church Street.</p>
            </SectionTitle>
          </Reveal>
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {[
              { t: 'Inside Fuji', p: PHOTOS.dining },
              { t: 'Our shopfront on Stoke Newington Church Street', p: PHOTOS.storefront },
            ].map(({ t, p }, i) => (
              <Reveal key={t} delay={i * 0.1}>
                <figure className="relative overflow-hidden rounded-[24px] border border-hair bg-black">
                  <Photo photo={p} alt={t} className="aspect-[4/3] w-full" sizes="(max-width: 768px) 92vw, 640px" />
                  <figcaption className="mono absolute bottom-0 left-0 z-[4] m-4 rounded-full bg-black/60 px-3 py-1 text-[0.68rem] uppercase tracking-[0.16em] text-cream backdrop-blur">{t}</figcaption>
                </figure>
              </Reveal>
            ))}
          </div>
          <div className="mt-12 flex flex-wrap gap-3">
            <Link to="/menu" className="btn btn-primary">Explore the menu <ArrowRight size={16} /></Link>
            <Link to="/reservations" className="btn btn-outline">Book a table</Link>
          </div>
        </div>
      </section>
    </>
  );
}
