import { useState } from 'react';
import { Shield, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { PortalUser } from './types';

interface Props {
  onLogin: (user: PortalUser) => void;
}

export default function LoginScreen({ onLogin }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { data, error: dbErr } = await supabase
      .from('customer_portal_users')
      .select('id, company_id, email, first_name, last_name, is_active, password_hash')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle();

    if (dbErr || !data) {
      setError('Invalid email or password.');
      setLoading(false);
      return;
    }
    if (!data.is_active) {
      setError('Your account has been deactivated. Please contact support.');
      setLoading(false);
      return;
    }
    if (data.password_hash !== password) {
      setError('Invalid email or password.');
      setLoading(false);
      return;
    }

    await supabase
      .from('customer_portal_users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', data.id);

    onLogin({ id: data.id, company_id: data.company_id, email: data.email, first_name: data.first_name, last_name: data.last_name, is_active: data.is_active });
    setLoading(false);
  }

  return (
    <div className="min-h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-900/40">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Customer Portal</h1>
          <p className="text-slate-400 text-sm mt-1">Sign in to manage your account</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
                placeholder="you@company.com"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPass ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-50 text-red-700 text-sm px-4 py-3 rounded-xl border border-red-200">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-100">
            <p className="text-xs text-gray-400 text-center">
              Need access? Contact your service provider.
            </p>
            <div className="mt-3 bg-gray-50 rounded-xl p-3 text-xs text-gray-500">
              <p className="font-semibold text-gray-600 mb-1">Demo logins:</p>
              <p>admin@acme.com — demo1234</p>
              <p>john@smith.com — demo1234</p>
              <p>manager@mall.com — demo1234</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
