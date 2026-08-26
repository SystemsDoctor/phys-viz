/**
 * Entry point. Mounts the shell.
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@/shell/App';
import '@/design/tokens.css';
import '@/design/shell.css';

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('main.tsx: #root not found in index.html');

createRoot(rootEl).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
