import { useState } from 'react';
import { PanelLeft, Eye, RotateCcw, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useSidebarLayout, saveSidebarLayout, menuLabel, DEFAULT_LAYOUT } from '../../config/sidebarMenu';

export default function SidebarMenuPanel() {
  const [layout, loading] = useSidebarLayout();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const run = async (key: string, next: typeof layout, okText: string) => {
    setBusy(key);
    setMessage(null);
    try {
      await saveSidebarLayout(next);
      setMessage({ tone: 'ok', text: okText });
    } catch {
      setMessage({ tone: 'error', text: 'Could not save the change. Please try again.' });
    }
    setBusy(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center rounded-xl border border-gray-200 bg-white py-16">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <PanelLeft className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Sidebar Menu</h2>
            <p className="mt-1 text-sm leading-relaxed text-gray-600">
              The menu order applies to everyone. To rearrange or hide pages, click <span className="font-medium text-gray-800">Edit menu</span> at
              the bottom of the left menu. Hidden pages are listed here so you can bring them back.
            </p>
          </div>
        </div>
      </div>

      {message && (
        <div className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm ${
          message.tone === 'ok' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-700'
        }`}>
          {message.tone === 'ok' ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          {message.text}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h3 className="text-sm font-semibold text-gray-900">Hidden pages</h3>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">{layout.hidden.length}</span>
        </div>
        {layout.hidden.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-gray-400">No pages are hidden. Everything shows in the menu.</p>
        ) : (
          <ul className="divide-y divide-gray-50">
            {layout.hidden.map(id => (
              <li key={id} className="flex items-center justify-between px-6 py-3 transition-colors hover:bg-gray-50/60">
                <span className="text-sm text-gray-700">{menuLabel(id)}</span>
                <button
                  onClick={() => run(id, { ...layout, hidden: layout.hidden.filter(h => h !== id) }, `${menuLabel(id)} is back in the menu.`)}
                  disabled={busy !== null}
                  className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-60"
                >
                  {busy === id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}
                  Unhide
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-6 py-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Reset menu to default</h3>
          <p className="mt-0.5 text-xs text-gray-500">Restores the original order and shows every page again.</p>
        </div>
        {confirmReset ? (
          <div className="flex items-center gap-2">
            <button onClick={() => setConfirmReset(false)} className="rounded-lg px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100">
              Cancel
            </button>
            <button
              onClick={async () => { await run('reset', DEFAULT_LAYOUT, 'The menu is back to its original order.'); setConfirmReset(false); }}
              disabled={busy !== null}
              className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-60"
            >
              {busy === 'reset' && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Yes, reset
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmReset(true)}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </button>
        )}
      </div>
    </div>
  );
}
