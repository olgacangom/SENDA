import React, { useState } from 'react';

const API_BASE = 'http://localhost:1574';

type LoginProps = {
  onLogin: (page: 'participants' | 'assignments' | 'admin', role: 'researcher' | 'admin', email?: string) => void;
  onBackToFront: () => void;
};

const Login: React.FC<LoginProps> = ({ onLogin, onBackToFront }) => {
  const [role, setRole] = useState<'researcher' | 'admin'>('admin');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-50 text-slate-900 flex items-center justify-center p-6">
      <main className="w-full max-w-md rounded-3xl border border-slate-200/80 bg-white p-8 shadow-2xl space-y-4">
        
        {/* Cabecera del formulario */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <img src="/images/senda.png" alt="SENDA Logo" className="h-[60px] w-[60px] object-contain" />
          </div>
          <button
            onClick={onBackToFront}
            className="text-xs font-semibold text-sky-600 hover:text-sky-800 transition cursor-pointer"
          >
            ← Volver al inicio
          </button>
        </div>

        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-950">Iniciar sesión</h1>
          <p className="mt-1 text-xs text-slate-500">Introduce tus credenciales para acceder al panel.</p>
        </div>

        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setError(null);
            setLoading(true);

            try {
              const endpoint =
                role === 'researcher'
                  ? `${API_BASE}/api/auth/researcher/login/`
                  : `${API_BASE}/api/admin/login/`;
              const body = JSON.stringify({
                [role === 'researcher' ? 'email' : 'username']: username,
                password,
              });
              const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body,
                credentials: 'include',
              });
              const json = await res.json();
              if (!res.ok) {
                setError(json.error || 'Error autenticando');
              } else {
                onLogin(role === 'researcher' ? 'assignments' : 'participants', role, username);
              }
            } catch {
              setError('Error de red');
            } finally {
              setLoading(false);
            }
          }}
          className="space-y-4"
          autoComplete="off"
        >
          <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 shadow-sm">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {role === 'admin' ? 'Usuario' : 'Correo institucional'}
              </label>
              <input
                value={username}
                onChange={(ev) => setUsername(ev.target.value)}
                type={role === 'admin' ? 'text' : 'email'}
                required
                autoComplete="off"
                placeholder={role === 'admin' ? 'admin' : 'investigador@senda.es'}
                className="w-full rounded-xl border border-slate-200 bg-white py-3 px-4 text-xs text-slate-900 shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Contraseña</label>
              <input
                value={password}
                onChange={(ev) => setPassword(ev.target.value)}
                type="password"
                required
                autoComplete="new-password"
                placeholder="••••••••"
                className="w-full rounded-xl border border-slate-200 bg-white py-3 px-4 text-xs text-slate-900 shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              />
            </div>
          </div>

          <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 shadow-sm">
            <p className="text-xs font-semibold text-slate-700">Rol</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-medium text-slate-700 shadow-sm transition hover:border-sky-300">
                <input
                  type="radio"
                  name="role"
                  value="researcher"
                  className="h-4 w-4 accent-sky-600"
                  checked={role === 'researcher'}
                  onChange={() => setRole('researcher')}
                />
                Investigador
              </label>
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-medium text-slate-700 shadow-sm transition hover:border-sky-300">
                <input
                  type="radio"
                  name="role"
                  value="admin"
                  className="h-4 w-4 accent-sky-600"
                  checked={role === 'admin'}
                  onChange={() => setRole('admin')}
                />
                Administrador
              </label>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center rounded-xl bg-sky-600 px-5 py-3 text-xs font-bold text-white transition hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-300 disabled:opacity-60 cursor-pointer shadow-lg shadow-sky-500/20"
            >
              {loading ? 'Procesando...' : 'Acceder al sistema'}
            </button>
            {error && <p className="mt-2 text-xs text-red-500 text-center font-medium">{error}</p>}
          </div>
        </form>

        <div className="border-t border-slate-100 pt-4 text-center text-[11px] text-slate-400">
          © 2026 SENDA · Andalucía
        </div>
      </main>
    </div>
  );
};

export default Login;