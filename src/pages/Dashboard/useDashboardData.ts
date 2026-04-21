import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';

export interface DashboardKpis {
  activeCustomers: number;
  openWorkOrders: number;
  activeDeals: number;
  openTickets: number;
  openLeads: number;
  arTotal: number;
  arOverdue: number;
  mrr: number;
  unackedAlarms: number;
  monthRevenue: number;
  prevMonthRevenue: number;
  pipelineValue: number;
  jobsToday: number;
  jobsCompletedToday: number;
  techsOnClock: number;
}

export interface AlarmEventRow {
  id: string;
  company: string;
  event_type: string;
  severity: string;
  event_timestamp: string;
  acknowledged_at: string | null;
}

export interface ScheduledJob {
  id: string;
  wo_number: string;
  title: string;
  status: string;
  priority: string | null;
  scheduled_time: string | null;
  company: string;
  technician: string;
  work_order_type: string;
}

export interface PipelineStage {
  stage: string;
  count: number;
  value: number;
}

export interface TicketRow {
  id: string;
  ticket_number: string;
  title: string;
  priority: string;
  status: string;
  created_at: string;
  due_date: string | null;
  company: string;
}

export interface AgingBucket {
  label: string;
  amount: number;
  count: number;
}

export interface TransactionRow {
  id: string;
  transaction_number: string;
  amount: number;
  transaction_type: string;
  payment_method: string | null;
  transaction_date: string;
  company: string;
}

export interface TechOnClock {
  id: string;
  name: string;
  clock_in_time: string;
  work_order: string | null;
}

export interface RevenuePoint {
  month: string;
  amount: number;
}

export interface DashboardData {
  kpis: DashboardKpis;
  alarms: AlarmEventRow[];
  schedule: ScheduledJob[];
  pipeline: PipelineStage[];
  tickets: TicketRow[];
  aging: AgingBucket[];
  transactions: TransactionRow[];
  techsOnClock: TechOnClock[];
  revenueTrend: RevenuePoint[];
  topDeals: Array<{ id: string; title: string; value: number; stage: string; probability: number; company: string; close_date: string | null }>;
}

const todayISO = () => new Date().toISOString().slice(0, 10);

const monthStartISO = (offset = 0) => {
  const d = new Date();
  d.setMonth(d.getMonth() + offset, 1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
};

const monthEndISO = (offset = 0) => {
  const d = new Date();
  d.setMonth(d.getMonth() + offset + 1, 0);
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
};

export function useDashboardData() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const today = todayISO();
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const endOfToday = new Date();
      endOfToday.setHours(23, 59, 59, 999);

      const [
        customersRes,
        woAllRes,
        woTodayRes,
        dealsRes,
        ticketsOpenRes,
        leadsRes,
        invoicesRes,
        rmrRes,
        alarmsUnackedRes,
        alarmsListRes,
        scheduleRes,
        ticketsListRes,
        txThisMonthRes,
        txLastMonthRes,
        txRecentRes,
        timeEntriesRes,
        employeesRes,
        topDealsRes,
        txTrendRes,
      ] = await Promise.all([
        supabase.from('companies').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('work_orders').select('id,status', { count: 'exact' }).limit(1000),
        supabase
          .from('work_orders')
          .select('id,status', { count: 'exact' })
          .eq('scheduled_date', today),
        supabase.from('deals').select('id,stage,value,sales_stage,probability,title,expected_close_date,company_id'),
        supabase.from('tickets').select('id', { count: 'exact', head: true }).not('status', 'in', '(closed,resolved)'),
        supabase.from('leads').select('id', { count: 'exact', head: true }).not('status', 'in', '(converted,lost)'),
        supabase.from('invoices').select('id,balance_due,due_date,status').not('status', 'in', '(paid,void)'),
        supabase.from('project_rmr').select('monthly_rate').eq('status', 'active'),
        supabase.from('alarm_events').select('id', { count: 'exact', head: true }).is('acknowledged_at', null),
        supabase
          .from('alarm_events')
          .select('id,event_type,severity,event_timestamp,acknowledged_at,company_id,companies(name)')
          .order('event_timestamp', { ascending: false })
          .limit(6),
        supabase
          .from('work_orders')
          .select('id,wo_number,title,status,priority,scheduled_time,work_order_type,assigned_to,company_id,companies(name),employees!work_orders_assigned_to_fkey(first_name,last_name)')
          .eq('scheduled_date', today)
          .order('scheduled_time', { ascending: true, nullsFirst: false })
          .limit(8),
        supabase
          .from('tickets')
          .select('id,ticket_number,title,priority,status,created_at,due_date,company_id,companies(name)')
          .not('status', 'in', '(closed,resolved)')
          .order('created_at', { ascending: false })
          .limit(6),
        supabase
          .from('transactions')
          .select('amount,transaction_type,transaction_date')
          .gte('transaction_date', monthStartISO(0).slice(0, 10))
          .lte('transaction_date', monthEndISO(0).slice(0, 10)),
        supabase
          .from('transactions')
          .select('amount,transaction_type,transaction_date')
          .gte('transaction_date', monthStartISO(-1).slice(0, 10))
          .lte('transaction_date', monthEndISO(-1).slice(0, 10)),
        supabase
          .from('transactions')
          .select('id,transaction_number,amount,transaction_type,payment_method,transaction_date,company_id,companies(name)')
          .order('transaction_date', { ascending: false })
          .limit(6),
        supabase
          .from('time_entries')
          .select('id,employee_id,clock_in_time,clock_out_time,work_order_id,employees(first_name,last_name),work_orders(wo_number)')
          .is('clock_out_time', null)
          .order('clock_in_time', { ascending: false })
          .limit(10),
        supabase.from('employees').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase
          .from('deals')
          .select('id,title,value,stage,sales_stage,probability,expected_close_date,close_date,company_id,companies(name)')
          .not('sales_stage', 'in', '(closed_won,closed_lost)')
          .order('value', { ascending: false })
          .limit(5),
        supabase
          .from('transactions')
          .select('amount,transaction_type,transaction_date')
          .gte('transaction_date', monthStartISO(-5).slice(0, 10)),
      ]);

      const invoices = invoicesRes.data || [];
      const rmr = rmrRes.data || [];
      const txThisMonth = txThisMonthRes.data || [];
      const txLastMonth = txLastMonthRes.data || [];
      const allWos = woAllRes.data || [];
      const allDeals = dealsRes.data || [];

      const sumPayments = (rows: { amount: number | string; transaction_type: string }[]) =>
        rows
          .filter((r) => (r.transaction_type || '').toLowerCase() === 'payment')
          .reduce((s, r) => s + Number(r.amount || 0), 0);

      const ar = invoices.reduce(
        (acc, i: any) => {
          const bal = Number(i.balance_due || 0);
          const due = i.due_date ? new Date(i.due_date) : null;
          const nowDate = new Date();
          acc.total += bal;
          if (due && due < nowDate) acc.overdue += bal;
          if (due) {
            const days = Math.floor((nowDate.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
            if (days <= 0) acc.current.amount += bal, acc.current.count += 1;
            else if (days <= 30) acc.b30.amount += bal, acc.b30.count += 1;
            else if (days <= 60) acc.b60.amount += bal, acc.b60.count += 1;
            else if (days <= 90) acc.b90.amount += bal, acc.b90.count += 1;
            else acc.b90plus.amount += bal, acc.b90plus.count += 1;
          } else {
            acc.current.amount += bal;
            acc.current.count += 1;
          }
          return acc;
        },
        {
          total: 0,
          overdue: 0,
          current: { amount: 0, count: 0 },
          b30: { amount: 0, count: 0 },
          b60: { amount: 0, count: 0 },
          b90: { amount: 0, count: 0 },
          b90plus: { amount: 0, count: 0 },
        }
      );

      const aging: AgingBucket[] = [
        { label: 'Current', amount: ar.current.amount, count: ar.current.count },
        { label: '1-30', amount: ar.b30.amount, count: ar.b30.count },
        { label: '31-60', amount: ar.b60.amount, count: ar.b60.count },
        { label: '61-90', amount: ar.b90.amount, count: ar.b90.count },
        { label: '90+', amount: ar.b90plus.amount, count: ar.b90plus.count },
      ];

      const pipelineMap = new Map<string, { count: number; value: number }>();
      allDeals.forEach((d: any) => {
        const key = d.sales_stage || d.stage || 'unknown';
        const cur = pipelineMap.get(key) || { count: 0, value: 0 };
        cur.count += 1;
        cur.value += Number(d.value || 0);
        pipelineMap.set(key, cur);
      });
      const pipeline: PipelineStage[] = Array.from(pipelineMap.entries())
        .map(([stage, v]) => ({ stage, count: v.count, value: v.value }))
        .sort((a, b) => b.value - a.value);

      const pipelineValue = allDeals
        .filter((d: any) => !['closed_won', 'closed_lost'].includes((d.sales_stage || '').toLowerCase()))
        .reduce((s: number, d: any) => s + Number(d.value || 0), 0);

      const mrr = rmr.reduce((s: number, r: any) => s + Number(r.monthly_rate || 0), 0);
      const monthRevenue = sumPayments(txThisMonth as any);
      const prevMonthRevenue = sumPayments(txLastMonth as any);

      const openWosCount = allWos.filter((w: any) => !['completed', 'cancelled', 'invoiced'].includes((w.status || '').toLowerCase())).length;
      const jobsToday = woTodayRes.count || 0;
      const jobsCompletedToday = (woTodayRes.data || []).filter((w: any) => w.status === 'completed').length;

      const alarms: AlarmEventRow[] = (alarmsListRes.data || []).map((a: any) => ({
        id: a.id,
        company: a.companies?.name || 'Unknown',
        event_type: a.event_type,
        severity: a.severity || 'medium',
        event_timestamp: a.event_timestamp,
        acknowledged_at: a.acknowledged_at,
      }));

      const schedule: ScheduledJob[] = (scheduleRes.data || []).map((w: any) => ({
        id: w.id,
        wo_number: w.wo_number,
        title: w.title,
        status: w.status,
        priority: w.priority,
        scheduled_time: w.scheduled_time,
        work_order_type: w.work_order_type,
        company: w.companies?.name || 'Unknown',
        technician: w.employees ? `${w.employees.first_name || ''} ${w.employees.last_name || ''}`.trim() : 'Unassigned',
      }));

      const tickets: TicketRow[] = (ticketsListRes.data || []).map((t: any) => ({
        id: t.id,
        ticket_number: t.ticket_number,
        title: t.title,
        priority: t.priority,
        status: t.status,
        created_at: t.created_at,
        due_date: t.due_date,
        company: t.companies?.name || 'Unknown',
      }));

      const transactions: TransactionRow[] = (txRecentRes.data || []).map((t: any) => ({
        id: t.id,
        transaction_number: t.transaction_number,
        amount: Number(t.amount || 0),
        transaction_type: t.transaction_type,
        payment_method: t.payment_method,
        transaction_date: t.transaction_date,
        company: t.companies?.name || '',
      }));

      const techsOnClock: TechOnClock[] = (timeEntriesRes.data || []).map((te: any) => ({
        id: te.id,
        name: te.employees ? `${te.employees.first_name || ''} ${te.employees.last_name || ''}`.trim() : 'Unknown',
        clock_in_time: te.clock_in_time,
        work_order: te.work_orders?.wo_number || null,
      }));

      const topDeals = (topDealsRes.data || []).map((d: any) => ({
        id: d.id,
        title: d.title,
        value: Number(d.value || 0),
        stage: d.sales_stage || d.stage || 'lead',
        probability: d.probability || 0,
        company: d.companies?.name || 'Unknown',
        close_date: d.expected_close_date || d.close_date,
      }));

      const trendMap = new Map<string, number>();
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i, 1);
        const key = d.toISOString().slice(0, 7);
        trendMap.set(key, 0);
      }
      (txTrendRes.data || []).forEach((t: any) => {
        if ((t.transaction_type || '').toLowerCase() !== 'payment') return;
        const key = String(t.transaction_date).slice(0, 7);
        if (trendMap.has(key)) trendMap.set(key, (trendMap.get(key) || 0) + Number(t.amount || 0));
      });
      const revenueTrend: RevenuePoint[] = Array.from(trendMap.entries()).map(([month, amount]) => ({
        month,
        amount,
      }));

      setData({
        kpis: {
          activeCustomers: customersRes.count || 0,
          openWorkOrders: openWosCount,
          activeDeals: allDeals.filter((d: any) => !['closed_won', 'closed_lost'].includes((d.sales_stage || '').toLowerCase())).length,
          openTickets: ticketsOpenRes.count || 0,
          openLeads: leadsRes.count || 0,
          arTotal: ar.total,
          arOverdue: ar.overdue,
          mrr,
          unackedAlarms: alarmsUnackedRes.count || 0,
          monthRevenue,
          prevMonthRevenue,
          pipelineValue,
          jobsToday,
          jobsCompletedToday,
          techsOnClock: (timeEntriesRes.data || []).length,
        },
        alarms,
        schedule,
        pipeline,
        tickets,
        aging,
        transactions,
        techsOnClock,
        revenueTrend,
        topDeals,
      });
      void employeesRes;
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, reload: load };
}
