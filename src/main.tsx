import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RoleProvider } from './contexts/RoleContext';
import App from './App.tsx';
import PublicProposal from './pages/PublicProposal/index';
import './index.css';

function getProposalToken(): string | null {
  const hash = window.location.hash;
  const match = hash.match(/^#\/proposal\/(.+)$/);
  return match ? match[1] : null;
}

const proposalToken = getProposalToken();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {proposalToken ? (
      <PublicProposal token={proposalToken} />
    ) : (
      <RoleProvider>
        <App />
      </RoleProvider>
    )}
  </StrictMode>
);
