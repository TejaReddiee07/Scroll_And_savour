import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout, { PageFallback } from './components/layout/Layout';

// Every page is code-split.
const Home = lazy(() => import('./pages/Home'));
const About = lazy(() => import('./pages/About'));
const Menu = lazy(() => import('./pages/Menu'));
const Gallery = lazy(() => import('./pages/Gallery'));
const Reservations = lazy(() => import('./pages/Reservations'));
const Order = lazy(() => import('./pages/Order'));
const OrderTrack = lazy(() => import('./pages/OrderTrack'));
const Catering = lazy(() => import('./pages/Catering'));
const Contact = lazy(() => import('./pages/Contact'));
const Privacy = lazy(() => import('./pages/Policies').then((m) => ({ default: m.Privacy })));
const Cookies = lazy(() => import('./pages/Policies').then((m) => ({ default: m.Cookies })));
const Allergens = lazy(() => import('./pages/Policies').then((m) => ({ default: m.Allergens })));
const NotFound = lazy(() => import('./pages/NotFound'));
const adminModules = import.meta.glob('./admin/AdminApp.jsx');
const AdminApp = lazy(
  () =>
    adminModules['./admin/AdminApp.jsx']?.() ??
    Promise.resolve({ default: () => <p className="p-10 text-cream">Admin dashboard not installed.</p> }),
);

export default function App() {
  // Tell the static loader (public/boot.js) we're ready once fonts have loaded (capped).
  useEffect(() => {
    const done = () => window.__fujiReady?.();
    const cap = setTimeout(done, 3200);
    (document.fonts?.ready || Promise.resolve()).then(() => {
      clearTimeout(cap);
      done();
    });
    return () => clearTimeout(cap);
  }, []);

  return (
    <Routes>
      <Route
        path="/admin/*"
        element={
          <Suspense fallback={<PageFallback />}>
            <AdminApp />
          </Suspense>
        }
      />
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="about" element={<About />} />
        <Route path="menu" element={<Menu />} />
        <Route path="gallery" element={<Gallery />} />
        <Route path="reservations" element={<Reservations />} />
        <Route path="order" element={<Order />} />
        <Route path="order/track/:reference" element={<OrderTrack />} />
        <Route path="catering" element={<Catering />} />
        <Route path="contact" element={<Contact />} />
        <Route path="privacy" element={<Privacy />} />
        <Route path="cookies" element={<Cookies />} />
        <Route path="allergens" element={<Allergens />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
