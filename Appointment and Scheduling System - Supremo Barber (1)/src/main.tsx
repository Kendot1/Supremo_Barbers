import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/globals.css';

// Global fix: Scroll focused inputs into view when mobile keyboard opens
// This prevents the virtual keyboard from covering input fields on iOS/Android
if (typeof window !== 'undefined') {
  document.addEventListener('focusin', (e) => {
    const target = e.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'SELECT'
    ) {
      // Wait for the keyboard to finish animating open
      setTimeout(() => {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    }
  });
}



ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);