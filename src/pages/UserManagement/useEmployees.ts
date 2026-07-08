import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import type { Employee, Certification, ServiceRate, BillingProduct } from './types';

export function useEmployees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    const { data } = await supabase
      .from('employees')
      .select('*')
      .order('last_name');
    if (data) setEmployees(data as Employee[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { employees, loading, refetch: fetch };
}

export function useCertifications(employeeId: string | null) {
  const [certs, setCerts] = useState<Certification[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!employeeId) { setCerts([]); return; }
    setLoading(true);
    supabase
      .from('employee_certifications')
      .select('*')
      .eq('employee_id', employeeId)
      .order('expiration_date', { ascending: true, nullsFirst: false })
      .then(({ data }) => {
        setCerts((data || []) as Certification[]);
        setLoading(false);
      });
  }, [employeeId]);

  return { certs, loading, refetch: () => {
    if (!employeeId) return;
    supabase
      .from('employee_certifications')
      .select('*')
      .eq('employee_id', employeeId)
      .order('expiration_date', { ascending: true, nullsFirst: false })
      .then(({ data }) => setCerts((data || []) as Certification[]));
  }};
}

export function useServiceRates() {
  const [rates, setRates] = useState<ServiceRate[]>([]);
  useEffect(() => {
    supabase.from('service_rates').select('id, name, hourly_rate').eq('is_active', true).order('sort_order')
      .then(({ data }) => { if (data) setRates(data as ServiceRate[]); });
  }, []);
  return rates;
}

export function useBillingProducts() {
  const [products, setProducts] = useState<BillingProduct[]>([]);
  useEffect(() => {
    supabase.from('products').select('id, name, sku, price, category').eq('is_active', true).order('name')
      .then(({ data }) => { if (data) setProducts(data as BillingProduct[]); });
  }, []);
  return products;
}
