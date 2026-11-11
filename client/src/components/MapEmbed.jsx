import { MapPin, ExternalLink } from 'lucide-react';
import { useConsent } from '../context/ConsentContext';
import { SITE } from '../data/site';

/** Google Maps embed that only loads after third-party consent (it sets Google cookies). */
export default function MapEmbed({ className = 'h-full min-h-[380px] w-full' }) {
  const { thirdParty, allowThirdParty } = useConsent();
  if (thirdParty) {
    return (
      <iframe
        title="Map showing Fuji Japanese Restaurant, 15 Stoke Newington Church Street, London N16 0NX"
        src={SITE.links.mapsEmbed}
        className={`${className} border-0`}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
      />
    );
  }
  return (
    <div className={`${className} relative grid place-items-center overflow-hidden bg-[#e9e1d3] p-6 text-center text-ink`}>
      <svg aria-hidden="true" className="absolute inset-0 h-full w-full opacity-60" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice">
        <rect width="400" height="300" fill="#efe7d8" />
        <path d="M-10 120 L410 90" stroke="#fff" strokeWidth="18" />
        <path d="M-10 120 L410 90" stroke="#d9cdb8" strokeWidth="2" strokeDasharray="10 8" />
        <path d="M150 -10 L190 310" stroke="#fff" strokeWidth="14" />
        <path d="M300 -10 L280 310" stroke="#fff" strokeWidth="10" />
        <path d="M-10 230 Q200 200 410 250" stroke="#fff" strokeWidth="10" fill="none" />
        <rect x="20" y="150" width="110" height="60" rx="8" fill="#cfe3c0" />
        <rect x="210" y="130" width="60" height="70" rx="6" fill="#ddd3c3" />
      </svg>
      <div className="relative max-w-sm rounded-2xl bg-white/90 p-6 shadow-lg backdrop-blur">
        <MapPin className="mx-auto text-fuji-red" size={30} aria-hidden="true" />
        <p className="mt-2 font-display text-lg">15 Stoke Newington Church Street, N16 0NX</p>
        <p className="mt-2 text-sm text-ink/70">The interactive map is provided by Google and sets third-party cookies. Load it only if you&apos;re happy to.</p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <button type="button" onClick={allowThirdParty} className="btn btn-primary btn-sm">Load Google Map</button>
          <a href={SITE.links.maps} target="_blank" rel="noreferrer" className="btn btn-outline-dark btn-sm">
            Open in Maps <ExternalLink size={13} />
          </a>
        </div>
      </div>
    </div>
  );
}
