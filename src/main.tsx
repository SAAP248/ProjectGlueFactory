import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RoleProvider } from './contexts/RoleContext';
import App from './App.tsx';
import CustomerEstimatePage from './pages/CustomerEstimate/index';
import PublicPayment from './pages/PublicPayment/index';
import './index.css';

type PublicRoute =
  | { type: 'estimate'; token: string; page?: string; preview: boolean }
  | { type: 'proposal'; token: string }
  | { type: 'pay'; token: string };

function getPublicRoute(): PublicRoute | null {
  const hash = window.location.hash;
  const estimateMatch = hash.match(/^#\/estimate\/([A-Za-z0-9]+)(?:\/([a-z]+))?(\?.*)?$/);
  if (estimateMatch) {
    return { type: 'estimate', token: estimateMatch[1], page: estimateMatch[2], preview: /[?&]preview=1/.test(estimateMatch[3] || '') };
  }
  const proposalMatch = hash.match(/^#\/proposal\/(.+)$/);
  if (proposalMatch) return { type: 'proposal', token: proposalMatch[1] };
  const payMatch = hash.match(/^#\/pay\/(.+)$/);
  if (payMatch) return { type: 'pay', token: payMatch[1] };
  return null;
}

const publicRoute = getPublicRoute();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {publicRoute?.type === 'estimate' ? (
      <CustomerEstimatePage token={publicRoute.token} initialPage={publicRoute.page} preview={publicRoute.preview} />
    ) : publicRoute?.type === 'proposal' ? (
      <CustomerEstimatePage dealToken={publicRoute.token} preview={false} />
    ) : publicRoute?.type === 'pay' ? (
      <PublicPayment token={publicRoute.token} />
    ) : (
      <RoleProvider>
        <App />
      </RoleProvider>
    )}
  </StrictMode>
);
