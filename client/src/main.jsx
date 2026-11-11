import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { MotionProvider } from './context/MotionContext';
import { ConsentProvider } from './context/ConsentContext';
import { SiteDataProvider } from './context/SiteDataContext';
import { CartProvider } from './context/CartContext';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <MotionProvider>
        <ConsentProvider>
          <SiteDataProvider>
            <CartProvider>
              <App />
            </CartProvider>
          </SiteDataProvider>
        </ConsentProvider>
      </MotionProvider>
    </BrowserRouter>
  </StrictMode>,
);
