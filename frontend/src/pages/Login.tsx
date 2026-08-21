import React, { useState, useEffect } from 'react';

const API_BASE = 'http://localhost:1574';

type LoginProps = {
  onLogin: (page: 'participants' | 'assignments' | 'admin', role: 'researcher' | 'admin', email?: string) => void;
  onBackToFront: () => void;
};

const Login: React.FC<LoginProps> = ({ onLogin, onBackToFront }) => {
  const [role, setRole] = useState<'researcher' | 'admin'>('admin');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const [step, setStep] = useState<1 | 2>(1);
  const [otpCode, setOtpCode] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('senda_dark_mode') === 'true';
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('senda_dark_mode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('senda_dark_mode', 'false');
    }
  }, [darkMode]);

  useEffect(() => {
    setUsername('');
    setPassword('');
    setOtpCode('');
    setStep(1);
    setError(null);
    setInfoMessage(null);
  }, [role]);

  const handleResearcherSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (step === 1) {
        const res = await fetch(`${API_BASE}/api/auth/researcher/request-code/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: username }),
          credentials: 'include',
        });
        const json = await res.json();
        if (!res.ok) {
          setError(json.error || 'Error al solicitar el código. ¿Has verificado tu correo tras el alta del administrador?');
        } else {
          setInfoMessage('Código temporal de acceso enviado a tu bandeja de entrada real.');
          setStep(2);
        }
      } else {
        const res = await fetch(`${API_BASE}/api/auth/researcher/verify-code/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: username, code: otpCode }),
          credentials: 'include',
        });
        const json = await res.json();
        if (!res.ok) {
          setError(json.error || 'Código incorrecto o caducado');
        } else {
          onLogin('assignments', 'researcher', username);
        }
      }
    } catch (err) {
      setError('Error de conexión o respuesta inválida');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/admin/login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
        credentials: 'include',
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Credenciales de administrador incorrectas');
      } else {
        onLogin('participants', 'admin', username);
      }
    } catch (err) {
      setError('Error de conexión o respuesta inválida');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex items-center justify-center p-6 relative transition-colors duration-300">
      
      {/* SWITCH MODO OSCURO */}
      <div className="absolute top-6 right-6 flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2 rounded-2xl shadow-sm">
        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
          {darkMode ? 'Modo Oscuro' : 'Modo Claro'}
        </span>
        <button
          onClick={() => setDarkMode(!darkMode)}
          title={darkMode ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
          className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full bg-slate-300 dark:bg-amber-500 transition-colors duration-200 ease-in-out focus:outline-none"
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
              darkMode ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      <main className="w-full max-w-md rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <img src="/images/senda.png" alt="SENDA Logo" className="h-[60px] w-[60px] object-contain" />
          </div>
          <button
            onClick={onBackToFront}
            className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:text-sky-800 dark:hover:text-sky-300 transition cursor-pointer"
          >
            ← Volver al inicio
          </button>
        </div>

        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-950 dark:text-white">Iniciar sesión</h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {role === 'admin' ? 'Acceso exclusivo para administradores.' : (step === 1 ? 'Introduce tu correo institucional autorizado.' : 'Introduce el código temporal recibido.')}
          </p>
        </div>

        <form
          onSubmit={role === 'admin' ? handleAdminSubmit : handleResearcherSubmit}
          className="space-y-4"
          autoComplete="off"
        >
          <div className="space-y-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 p-4 shadow-sm">
            {role === 'admin' || step === 1 ? (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {role === 'admin' ? 'Usuario administrador' : 'Correo investigador/a'}
                </label>
                <input
                  value={username}
                  onChange={(ev) => setUsername(ev.target.value)}
                  type={role === 'admin' ? 'text' : 'email'}
                  required
                  autoComplete="new-password"
                  placeholder={role === 'admin' ? 'Introduce tu usuario' : 'usuario@correo.com'}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-3 px-4 text-xs text-slate-900 dark:text-white shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Código temporal de un solo uso</label>
                <input
                  value={otpCode}
                  onChange={(ev) => setOtpCode(ev.target.value)}
                  type="text"
                  required
                  autoComplete="new-password"
                  placeholder="123456"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-3 px-4 text-xs text-slate-900 dark:text-white shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100 text-center tracking-widest font-mono text-base"
                />
                <button
                  type="button"
                  onClick={() => { setStep(1); setOtpCode(''); setError(null); setInfoMessage(null); }}
                  className="mt-2 text-[11px] text-sky-600 dark:text-sky-400 hover:underline block text-right w-full cursor-pointer"
                >
                  ¿Cambiar correo o reenviar código?
                </button>
              </div>
            )}

            {role === 'admin' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Contraseña</label>
                <input
                  value={password}
                  onChange={(ev) => setPassword(ev.target.value)}
                  type="password"
                  required
                  autoComplete="new-password"
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-3 px-4 text-xs text-slate-900 dark:text-white shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                />
              </div>
            )}
          </div>

          <div className="space-y-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 p-4 shadow-sm">
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Rol</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-xs font-medium text-slate-700 dark:text-slate-300 shadow-sm transition hover:border-sky-300">
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
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-xs font-medium text-slate-700 dark:text-slate-300 shadow-sm transition hover:border-sky-300">
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
              {loading ? 'Procesando...' : (role === 'researcher' && step === 1 ? 'Solicitar código de verificación' : 'Acceder al sistema')}
            </button>
            {infoMessage && <p className="mt-2 text-xs text-emerald-600 dark:text-emerald-400 text-center font-medium">{infoMessage}</p>}
            {error && <p className="mt-2 text-xs text-red-500 dark:text-red-400 text-center font-medium">{error}</p>}
          </div>
        </form>

        <div className="border-t border-slate-100 dark:border-slate-800 pt-4 text-center text-[11px] text-slate-400">
          © 2026 SENDA · Andalucía
        </div>
      </main>
    </div>
  );
};

export default Login;