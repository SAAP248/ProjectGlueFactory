import { supabase } from '../../lib/supabase';
import { formatDate, formatMoney } from './useEstimates';
import type { EstimateDetailData } from './useEstimates';

function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function printEstimate(detail: EstimateDetailData) {
  const win = window.open('', '_blank', 'width=900,height=1100');
  if (!win) return false;

  const { data: profile } = await supabase
    .from('company_profile').select('name, address, city, state, zip, phone, license_number').limit(1).maybeSingle();

  const { estimate: e, lineItems } = detail;
  const site = e.sites;
  const rows = lineItems
    .map(
      (li) => `<tr>
        <td>${esc(li.description)}</td>
        <td class="num">${esc(Number(li.quantity))}</td>
        <td class="num">${esc(formatMoney(li.unit_price))}</td>
        <td class="num">${esc(formatMoney(Number(li.quantity) * Number(li.unit_price)))}</td>
      </tr>`
    )
    .join('');

  win.document.write(`<!doctype html><html><head><title>${esc(e.estimate_number)}</title>
  <style>
    body{font-family:Inter,system-ui,-apple-system,sans-serif;color:#111827;margin:48px;line-height:1.5}
    h1{font-size:28px;margin:0;letter-spacing:-0.02em}
    .muted{color:#6b7280;font-size:13px}
    .top{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #1d4ed8;padding-bottom:24px;margin-bottom:24px}
    .grid{display:flex;gap:48px;margin-bottom:32px}
    .label{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#6b7280;margin-bottom:4px}
    table{width:100%;border-collapse:collapse;font-size:14px}
    th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#6b7280;border-bottom:1px solid #e5e7eb;padding:8px}
    td{padding:10px 8px;border-bottom:1px solid #f3f4f6}
    .num{text-align:right;white-space:nowrap}
    .totals{margin-left:auto;width:280px;margin-top:16px;font-size:14px}
    .totals div{display:flex;justify-content:space-between;padding:6px 0}
    .totals .grand{border-top:2px solid #111827;font-weight:700;font-size:17px;padding-top:10px}
    .section{margin-top:32px;font-size:14px;white-space:pre-wrap}
    .sign{margin-top:56px;display:flex;gap:48px}
    .sign div{flex:1;border-top:1px solid #9ca3af;padding-top:6px;font-size:12px;color:#6b7280}
  </style></head><body>
  <div class="top">
    <div>
      <h1>${esc(profile?.name || 'Estimate')}</h1>
      <div class="muted">${esc([profile?.address, [profile?.city, profile?.state, profile?.zip].filter(Boolean).join(' ')].filter(Boolean).join(', '))}</div>
      <div class="muted">${esc(profile?.phone || '')}${profile?.license_number ? ` &middot; License ${esc(profile.license_number)}` : ''}</div>
    </div>
    <div style="text-align:right">
      <div class="label">Estimate</div>
      <div style="font-size:18px;font-weight:600">${esc(e.estimate_number)}</div>
      <div class="muted">Date: ${esc(formatDate(e.estimate_date))}</div>
      <div class="muted">Expires: ${esc(formatDate(e.expiration_date))}</div>
    </div>
  </div>
  <div class="grid">
    <div><div class="label">Prepared For</div><div style="font-weight:600">${esc(e.companies?.name || '')}</div></div>
    ${site ? `<div><div class="label">Site</div><div>${esc(site.name || '')}</div><div class="muted">${esc([site.address, site.city, site.state, site.zip].filter(Boolean).join(', '))}</div></div>` : ''}
  </div>
  <table><thead><tr><th>Description</th><th class="num">Qty</th><th class="num">Unit Price</th><th class="num">Amount</th></tr></thead><tbody>${rows}</tbody></table>
  <div class="totals">
    <div><span>Subtotal</span><span>${esc(formatMoney(e.subtotal))}</span></div>
    <div><span>Tax</span><span>${esc(formatMoney(e.tax))}</span></div>
    <div class="grand"><span>Total</span><span>${esc(formatMoney(e.total))}</span></div>
  </div>
  ${e.notes ? `<div class="section"><div class="label">Notes</div>${esc(e.notes)}</div>` : ''}
  ${e.terms ? `<div class="section"><div class="label">Terms</div>${esc(e.terms)}</div>` : ''}
  <div class="sign"><div>Customer Signature</div><div>Date</div></div>
  </body></html>`);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 300);
  return true;
}
