import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <div className="font-sans antialiased text-on-surface bg-background min-h-screen">
      <App />
    </div>
  </StrictMode>,
);
