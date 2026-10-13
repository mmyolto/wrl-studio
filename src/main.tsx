import { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { ErrorBoundary } from './components/layout/ErrorBoundary';
import './index.css';
import { isFirebaseConfigured } from './lib/config';
import { ConfigMissing } from './pages/ConfigMissing';
import { registerServiceWorker } from './lib/pwa';

// App (and Firebase) only load once the config is present.
const App = lazy(() => import('./App'));

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

createRoot(root).render(
  <StrictMode>
    <ErrorBoundary>
      {isFirebaseConfigured ? (
        <Suspense fallback={null}>
          <App />
        </Suspense>
      ) : (
        <ConfigMissing />
      )}
    </ErrorBoundary>
  </StrictMode>,
);

registerServiceWorker();
