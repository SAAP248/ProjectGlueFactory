import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { Layers, LayoutGrid, CheckCircle2, XCircle, ChevronDown, Clock, Shield } from 'lucide-react';
import ProposalChat from './ProposalChat';

interface ProposalData {
  estimate: any;
  deal: any;
  company: any;
  site: any;
  lineItems: any[];
  systems: any[];
  rooms: any[];
  messages: any[];
}

function formatCurrency(v: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v);
}

export default function PublicProposal({ token }: { token: string }) {
  const [data, setData] = useState<ProposalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState<'by_system' | 'by_room'>('by_system');

  const [showAccept, setShowAccept] = useState(false);
  const [showDecline, setShowDecline] = useState(false);
  const [acceptName, setAcceptName] = useState('');
  const [acceptAgreed, setAcceptAgreed] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);

  const fetchProposal = useCallback(async () => {
    setLoading(true);
    const { data: deal } = await supabase
      .from('deals')
      .select('id, title, company_id, site_id, scope_of_work, proposal_token, companies(name, billing_address, billing_city, billing_state, billing_zip)')
      .eq('proposal_token', token)
      .single();

    if (!deal) {
      setError('Proposal not found. Please check the link and try again.');
      setLoading(false);
      return;
    }

    const [
      { data: estimate },
      { data: systems },
      { data: site },
    ] = await Promise.all([
      supabase.from('estimates').select('*').eq('deal_id', deal.id).order('created_at', { ascending: false }).limit(1).single(),
      supabase.from('deal_systems').select('*, system_types(name, icon_name, color)').eq('deal_id', deal.id).order('sort_order'),
      deal.site_id ? supabase.from('sites').select('name, address, city, state, zip').eq('id', deal.site_id).single() : Promise.resolve({ data: null }),
    ]);

    if (!estimate) {
      setError('No proposal found for this deal.');
      setLoading(false);
      return;
    }

    const [
      { data: lineItems },
      { data: rooms },
      { data: messages },
    ] = await Promise.all([
      supabase.from('estimate_line_items').select('*').eq('estimate_id', estimate.id).order('sort_order'),
      supabase.from('proposal_rooms').select('*').eq('estimate_id', estimate.id).order('sort_order'),
      supabase.from('proposal_messages').select('*').eq('estimate_id', estimate.id).order('created_at'),
    ]);

    setViewMode(estimate.grouping_mode || 'by_system');
    setData({
      estimate,
      deal,
      company: deal.companies,
      site: site,
      lineItems: lineItems || [],
      systems: systems || [],
      rooms: rooms || [],
      messages: messages || [],
    });
    setLoading(false);
  }, [token]);

  useEffect(() => { fetchProposal(); }, [fetchProposal]);

  async function handleAccept() {
    if (!acceptName.trim() || !acceptAgreed || !data) return;
    setSubmitting(true);
    await supabase.from('estimates').update({
      status: 'approved',
      accepted_at: new Date().toISOString(),
      customer_name_signed: acceptName.trim(),
    }).eq('id', data.estimate.id);
    await fetchProposal();
    setSubmitting(false);
    setShowAccept(false);
  }

  async function handleDecline() {
    if (!data) return;
    setSubmitting(true);
    await supabase.from('estimates').update({
      status: 'declined',
      declined_at: new Date().toISOString(),
      declined_reason: declineReason.trim() || null,
    }).eq('id', data.estimate.id);
    await fetchProposal();
    setSubmitting(false);
    setShowDecline(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading proposal...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <Shield className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Proposal Not Found</h1>
          <p className="text-sm text-gray-500">{error || 'Please check the link and try again.'}</p>
        </div>
      </div>
    );
  }

  const { estimate, company, site, lineItems, systems, rooms } = data;
  const isExpired = estimate.expiration_date && new Date(estimate.expiration_date) < new Date();
  const isAccepted = estimate.status === 'approved';
  const isDeclined = estimate.status === 'declined';

  function getGroupedItems() {
    if (viewMode === 'by_room' && rooms.length > 0) {
      const groups = rooms.map((r: any) => ({
        id: r.id,
        name: r.name,
        items: lineItems.filter((i: any) => i.room_id === r.id),
      }));
      const unassigned = lineItems.filter((i: any) => !i.room_id);
      if (unassigned.length > 0) groups.push({ id: 'other', name: 'Other Items', items: unassigned });
      return groups;
    }

    if (systems.length > 0) {
      const groups = systems.map((s: any) => ({
        id: s.id,
        name: s.name,
        items: lineItems.filter((i: any) => i.system_group_id === s.id),
      }));
      const unassigned = lineItems.filter((i: any) => !i.system_group_id);
      if (unassigned.length > 0) groups.push({ id: 'other', name: 'Other Items', items: unassigned });
      return groups;
    }

    return [{ id: 'all', name: 'Products & Services', items: lineItems }];
  }

  const groups = getGroupedItems();
  const hasRooms = rooms.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center">
              <span className="text-white font-black text-sm">W</span>
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">Proposal</p>
              <p className="text-xs text-gray-500">#{estimate.estimate_number}</p>
            </div>
          </div>
          {isAccepted && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-xs font-bold border border-green-200">
              <CheckCircle2 className="h-3.5 w-3.5" /> Accepted
            </span>
          )}
          {isDeclined && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-700 rounded-full text-xs font-bold border border-red-200">
              <XCircle className="h-3.5 w-3.5" /> Declined
            </span>
          )}
          {!isAccepted && !isDeclined && estimate.expiration_date && (
            <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${
              isExpired ? 'bg-red-50 text-red-700 border-red-200' : 'bg-gray-50 text-gray-600 border-gray-200'
            }`}>
              <Clock className="h-3.5 w-3.5" />
              {isExpired ? 'Expired' : `Valid until ${new Date(estimate.expiration_date).toLocaleDateString()}`}
            </span>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* Prepared For */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Prepared For</p>
              <p className="text-lg font-bold text-gray-900">{company?.name || 'Customer'}</p>
              {site && (
                <p className="text-sm text-gray-600 mt-1">
                  {site.address}{site.city && `, ${site.city}`}{site.state && `, ${site.state}`} {site.zip}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Proposal Total</p>
              <p className="text-3xl font-bold text-gray-900">{formatCurrency(estimate.total)}</p>
              <p className="text-sm text-gray-500 mt-1">{estimate.estimate_date && new Date(estimate.estimate_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
            </div>
          </div>
        </div>

        {/* View Toggle */}
        {hasRooms && systems.length > 0 && (
          <div className="flex items-center justify-center">
            <div className="flex items-center gap-1 bg-white rounded-xl border border-gray-200 p-1 shadow-sm">
              <button
                onClick={() => setViewMode('by_system')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  viewMode === 'by_system' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Layers className="h-4 w-4" /> By System
              </button>
              <button
                onClick={() => setViewMode('by_room')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  viewMode === 'by_room' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <LayoutGrid className="h-4 w-4" /> By Room
              </button>
            </div>
          </div>
        )}

        {/* Product Groups */}
        <div className="space-y-6">
          {groups.filter(g => g.items.length > 0).map(group => {
            const groupTotal = group.items.reduce((s: number, i: any) => s + Number(i.quantity) * Number(i.unit_price), 0);
            return (
              <div key={group.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-900">{group.name}</h3>
                  <span className="text-sm font-bold text-gray-700">{formatCurrency(groupTotal)}</span>
                </div>
                <div className="divide-y divide-gray-100">
                  {group.items.map((item: any) => (
                    <div key={item.id} className="px-6 py-4 flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{item.description}</p>
                        {viewMode === 'by_room' && item.system_group_id && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            {systems.find((s: any) => s.id === item.system_group_id)?.name || ''}
                          </p>
                        )}
                        {viewMode === 'by_system' && item.room_id && rooms.length > 0 && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            {rooms.find((r: any) => r.id === item.room_id)?.name || ''}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-6 flex-shrink-0">
                        <span className="text-xs text-gray-500 tabular-nums">Qty: {item.quantity}</span>
                        <span className="text-sm font-semibold text-gray-900 tabular-nums w-24 text-right">
                          {formatCurrency(Number(item.quantity) * Number(item.unit_price))}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Grand Total */}
        <div className="bg-gray-900 text-white rounded-2xl p-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-300">Total Investment</p>
            <p className="text-xs text-gray-400 mt-0.5">{lineItems.length} item{lineItems.length !== 1 ? 's' : ''}</p>
          </div>
          <p className="text-3xl font-bold">{formatCurrency(estimate.total)}</p>
        </div>

        {/* Scope of Work */}
        {estimate.notes && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 mb-3">Scope of Work</h3>
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{estimate.notes}</p>
          </div>
        )}

        {/* Terms */}
        {estimate.terms && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <button
              onClick={() => setTermsOpen(!termsOpen)}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <h3 className="text-sm font-bold text-gray-900">Terms & Conditions</h3>
              <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${termsOpen ? 'rotate-180' : ''}`} />
            </button>
            {termsOpen && (
              <div className="px-6 pb-6">
                <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">{estimate.terms}</p>
              </div>
            )}
          </div>
        )}

        {/* Accept / Decline Section */}
        {!isAccepted && !isDeclined && !isExpired && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-gray-900">Ready to move forward?</h3>

            {!showAccept && !showDecline && (
              <div className="flex gap-3">
                <button
                  onClick={() => setShowAccept(true)}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-green-600 text-white rounded-xl font-semibold text-sm hover:bg-green-700 transition-colors shadow-sm"
                >
                  <CheckCircle2 className="h-5 w-5" /> Accept Proposal
                </button>
                <button
                  onClick={() => setShowDecline(true)}
                  className="px-6 py-3.5 border border-gray-300 text-gray-700 rounded-xl font-medium text-sm hover:bg-gray-50 transition-colors"
                >
                  Decline
                </button>
              </div>
            )}

            {showAccept && (
              <div className="space-y-4 p-4 bg-green-50 border border-green-200 rounded-xl">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Your Full Name (as signature)</label>
                  <input
                    type="text"
                    value={acceptName}
                    onChange={e => setAcceptName(e.target.value)}
                    placeholder="Type your full name"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 font-medium"
                  />
                </div>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={acceptAgreed}
                    onChange={e => setAcceptAgreed(e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-green-600"
                  />
                  <span className="text-sm text-gray-700">I have reviewed and accept this proposal including all terms and conditions.</span>
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={handleAccept}
                    disabled={!acceptName.trim() || !acceptAgreed || submitting}
                    className="px-6 py-2.5 bg-green-600 text-white rounded-lg font-semibold text-sm hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    {submitting ? 'Submitting...' : 'Confirm Acceptance'}
                  </button>
                  <button onClick={() => setShowAccept(false)} className="px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {showDecline && (
              <div className="space-y-4 p-4 bg-red-50 border border-red-200 rounded-xl">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Reason (optional)</label>
                  <textarea
                    value={declineReason}
                    onChange={e => setDeclineReason(e.target.value)}
                    rows={3}
                    placeholder="Let us know if there's anything we can adjust..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleDecline}
                    disabled={submitting}
                    className="px-6 py-2.5 bg-red-600 text-white rounded-lg font-semibold text-sm hover:bg-red-700 disabled:opacity-50 transition-colors"
                  >
                    {submitting ? 'Submitting...' : 'Decline Proposal'}
                  </button>
                  <button onClick={() => setShowDecline(false)} className="px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Accepted state */}
        {isAccepted && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
            <CheckCircle2 className="h-10 w-10 text-green-600 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-green-900 mb-1">Proposal Accepted</h3>
            <p className="text-sm text-green-700">
              Signed by {estimate.customer_name_signed} on {new Date(estimate.accepted_at).toLocaleDateString()}
            </p>
          </div>
        )}

        {isDeclined && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
            <XCircle className="h-10 w-10 text-red-400 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-red-900 mb-1">Proposal Declined</h3>
            <p className="text-sm text-red-700">
              {estimate.declined_reason || 'No reason provided.'}
            </p>
            <p className="text-xs text-red-500 mt-2">Have questions? Use the chat below to reach the sales team.</p>
          </div>
        )}

        {/* Q&A Chat */}
        <ProposalChat
          estimateId={estimate.id}
          rooms={rooms}
          lineItems={lineItems}
          systems={systems}
          initialMessages={data.messages}
          onMessageSent={fetchProposal}
        />
      </main>

      {/* Footer */}
      <footer className="max-w-4xl mx-auto px-6 py-8 text-center">
        <p className="text-xs text-gray-400">This proposal was generated by WorkHorse. Powered by secure technology.</p>
      </footer>
    </div>
  );
}
