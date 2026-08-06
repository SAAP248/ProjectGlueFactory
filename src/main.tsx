import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RoleProvider } from './contexts/RoleContext';
import App from './App.tsx';
import PublicProposal from './pages/PublicProposal/index';
import PublicPayment from './pages/PublicPayment/index';
import './index.css';

function getPublicRoute(): { type: 'proposal' | 'pay'; token: string } | null {
  const hash = window.location.hash;
  const proposalMatch = hash.match(/^#\/proposal\/(.+)$/);
  if (proposalMatch) return { type: 'proposal', token: proposalMatch[1] };
  const payMatch = hash.match(/^#\/pay\/(.+)$/);
  if (payMatch) return { type: 'pay', token: payMatch[1] };
  return null;
}

const publicRoute = getPublicRoute();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {publicRoute?.type === 'proposal' ? (
      <PublicProposal token={publicRoute.token} />
    ) : publicRoute?.type === 'pay' ? (
      <PublicPayment token={publicRoute.token} />
    ) : (
      <RoleProvider>
        <App />
      </RoleProvider>
    )}
  </StrictMode>
);
