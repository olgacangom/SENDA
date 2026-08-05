import React, { useEffect, useState } from 'react';

const API_BASE = 'http://localhost:1574';

type LoginProps = {
  onLogin: (page: 'participants' | 'assignments' | 'admin', role: 'researcher' | 'admin', email?: string) => void;
};

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [participantsCount, setParticipantsCount] = useState<number | null>(null);
  const [fitbitsCount, setFitbitsCount] = useState<number | null>(null);
  const [recordsCount, setRecordsCount] = useState<number | null>(null);
  const [role, setRole] = useState<'researcher' | 'admin'>('admin');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/participants/`)
      .then((r) => r.json())
      .then((data) => setParticipantsCount(data.count))
      .catch(() => setParticipantsCount(null));

    fetch(`${API_BASE}/api/fitbits/`)
      .then((r) => r.json())
      .then((data) => setFitbitsCount(data.count))
      .catch(() => setFitbitsCount(null));

    fetch(`${API_BASE}/api/synclogs/`)
      .then((r) => r.json())
      .then((data) => setRecordsCount(data.total_records ?? data.count ?? null))
      .catch(() => setRecordsCount(null));
  }, []);

  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-50 text-slate-900">
      <div className="flex h-full w-full flex-col lg:flex-row">
        
        {/* Columna Izquierda */}
        <main className="flex h-full w-full flex-col justify-between bg-white px-6 py-6 sm:px-10 lg:w-1/2 lg:px-16 lg:py-10 overflow-y-auto">
          <div className="mx-auto w-full max-w-lg my-auto">
            <header className="mb-6 flex items-center gap-3">
              <img src="/images/senda.png" alt="SENDA Logo" className="h-16 w-16 object-contain" />
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-600">SENDA</p>
                <p className="text-[10px] uppercase tracking-[0.3em] text-slate-400">Salud · Neurociencia · Andalucía</p>
              </div>
            </header>

            <div className="mb-6">
              <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-slate-600 shadow-sm">
                Plataforma de investigación
              </span>
              <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">Bienvenido/a</h1>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Accede a tu panel de investigación SENDA
              </p>
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
                } catch (err) {
                  setError('Error de red');
                } finally {
                  setLoading(false);
                }
              }}
              className="space-y-4"
              autoComplete="off"
            >
              <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 shadow-sm shadow-slate-200/50">
                <label className="block text-xs font-semibold text-slate-700">
                  {role === 'admin' ? 'Usuario' : 'Correo institucional'}
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                    </svg>
                  </span>
                  {/* Atributos para deshabilitar autocompletado pasivo de Google */}
                  <input
                    value={username}
                    onChange={(ev) => setUsername(ev.target.value)}
                    type={role === 'admin' ? 'text' : 'email'}
                    required
                    autoComplete="new-username"
                    name="senda_unique_login_user"
                    placeholder={role === 'admin' ? 'admin' : 'investigador@senda.es'}
                    className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                  />
                </div>

                <label className="block text-xs font-semibold text-slate-700">Contraseña</label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </span>
                  <input
                    value={password}
                    onChange={(ev) => setPassword(ev.target.value)}
                    type="password"
                    required
                    autoComplete="new-password"
                    name="senda_unique_login_pass"
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                  />
                </div>
              </div>

              <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 shadow-sm shadow-slate-200/50">
                <p className="text-xs font-semibold text-slate-700">Rol</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs font-medium text-slate-700 shadow-sm transition hover:border-sky-300 hover:bg-slate-50">
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
                  <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs font-medium text-slate-700 shadow-sm transition hover:border-sky-300 hover:bg-slate-50">
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
                  className="inline-flex w-full items-center justify-center rounded-xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-300 disabled:opacity-60"
                >
                  {loading ? 'Procesando...' : 'Iniciar sesión'}
                  <span className="ml-2 text-lg">→</span>
                </button>
                {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
              </div>
            </form>

            <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span>Acceso protegido · Cumplimiento RGPD</span>
            </div>
          </div>

          <footer className="border-t border-slate-200 pt-4 text-xs text-slate-400">
            © 2026 SENDA · Salud Emocional y Neurociencia para el Desarrollo de Andalucía
          </footer>
        </main>

        {/* Columna Derecha */}
        <aside className="hidden w-full lg:flex lg:w-1/2 items-center justify-center bg-gradient-to-br from-sky-700 via-sky-500 to-slate-400 px-12 py-10 text-white overflow-hidden">
          <div className="relative max-w-xl my-auto">
            <div className="absolute -left-16 top-6 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute -right-16 bottom-6 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
            <div className="relative z-10 space-y-6">
              <span className="inline-flex rounded-full bg-white/10 px-4 py-1 text-xs uppercase tracking-[0.24em] text-slate-100 backdrop-blur-sm">
                Plataforma de investigación
              </span>
              <div>
                <h2 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">Investigación clínica con datos fisiológicos continuos.</h2>
                <p className="mt-4 text-sm leading-6 text-slate-100/90 sm:text-base">
                  Gestiona participantes, pulseras Fitbit y sincronizaciones con Google Health API desde una única plataforma diseñada para equipos científicos.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/20 bg-white/10 p-4 shadow-lg shadow-slate-950/10 backdrop-blur-md">
                  <p className="text-2xl font-semibold">{participantsCount !== null ? participantsCount : '—'}</p>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-slate-200">Participantes</p>
                </div>
                <div className="rounded-2xl border border-white/20 bg-white/10 p-4 shadow-lg shadow-slate-950/10 backdrop-blur-md">
                  <p className="text-2xl font-semibold">{fitbitsCount !== null ? fitbitsCount : '—'}</p>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-slate-200">Pulseras activas</p>
                </div>
                <div className="rounded-2xl border border-white/20 bg-white/10 p-4 shadow-lg shadow-slate-950/10 backdrop-blur-md">
                  <p className="text-2xl font-semibold">{recordsCount !== null ? recordsCount : '—'}</p>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-slate-200">Registros</p>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default Login;