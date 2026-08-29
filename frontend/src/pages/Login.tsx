import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const API_BASE = 'http://localhost:1574';

type LoginProps = {
  onLogin: (page: 'participants' | 'assignments' | 'admin', role: 'researcher' | 'admin', email?: string) => void;
  onBackToFront: () => void;
};

const Login: React.FC<LoginProps> = ({ onLogin, onBackToFront }) => {
  const { t, i18n } = useTranslation();
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
          setError(json.error || 'Error al solicitar el código.');
        } else {
          setInfoMessage('Código temporal de acceso enviado a tu bandeja de entrada.');
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
    <div className="relative min-h-screen w-full overflow-hidden bg-[#f5f8fc] dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex items-center justify-center p-6 transition-colors duration-300">
      
      {/* =====================================================
          FONDO DECORATIVO
         ===================================================== */}
      <div className="pointer-events-none absolute right-[4%] top-[4%] h-[65vh] w-[48vw] max-w-[760px] rounded-full bg-blue-200/20 dark:bg-blue-900/10 blur-[100px]" />
      <div className="pointer-events-none absolute right-[12%] top-[12%] h-[45vh] w-[35vw] max-w-[600px] rounded-full bg-cyan-100/30 dark:bg-cyan-950/10 blur-[80px]" />

      {/* CEREBRO DE FONDO */}
      <div
        className="pointer-events-none absolute right-[0%] top-[9%] z-0 w-[50vw] max-w-[800px] select-none hidden lg:block"
        style={{
          opacity: 0.35,
          maskImage: `
            radial-gradient(
              ellipse 58% 58% at 62% 48%,
              black 0%,
              black 30%,
              rgba(0,0,0,0.8) 50%,
              rgba(0,0,0,0.3) 70%,
              transparent 85%
            )
          `,
          WebkitMaskImage: `
            radial-gradient(
              ellipse 58% 58% at 62% 48%,
              black 0%,
              black 30%,
              rgba(0,0,0,0.8) 50%,
              rgba(0,0,0,0.3) 70%,
              transparent 85%
            )
          `,
        }}
      >
        <img
          src="/images/cerebro.png"
          alt=""
          aria-hidden="true"
          className="block w-full h-auto object-contain mix-blend-darken dark:mix-blend-luminosity opacity-90"
        />
      </div>

      {/* Velo de transición lateral */}
      <div className="pointer-events-none absolute inset-0 z-[1] bg-[linear-gradient(90deg,#f5f8fc_0%,rgba(245,248,252,0.98)_25%,rgba(245,248,252,0.6)_48%,transparent_75%)] dark:bg-[linear-gradient(90deg,#020617_0%,rgba(2,6,23,0.96)_28%,rgba(2,6,23,0.45)_52%,transparent_78%)]" />

      {/* CONTROLES SUPERIORES (Selector de idioma + Switch Modo Oscuro) */}
      <div className="absolute top-6 right-6 z-20 flex items-center gap-3">
        
        {/* SELECTOR DE IDIOMA */}
        <div className="flex items-center rounded-[25px] border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900/90 p-0.5 shadow-sm backdrop-blur-md">
          <button
            onClick={() => i18n.changeLanguage('es')}
            className={`flex h-7 items-center justify-center gap-2 rounded-[22px] px-2 transition-all duration-300 cursor-pointer ${
              i18n.language === 'es'
                ? 'bg-white dark:bg-slate-700 text-emerald-950 dark:text-emerald-300 shadow-sm font-bold border border-emerald-700 dark:border-emerald-500'
                : 'text-slate-500 dark:text-slate-400 font-medium'
            }`}
          >
            <img src="https://flagcdn.com/w40/es.png" alt="Español" className="h-5 w-5 rounded-full object-cover shadow-sm" />
            <span className="text-xs">ES</span>
          </button>
          <button
            onClick={() => i18n.changeLanguage('en')}
            className={`flex h-7 items-center justify-center gap-2 rounded-[22px] px-2 flex-row-reverse transition-all duration-300 cursor-pointer ${
              i18n.language === 'en'
                ? 'bg-white dark:bg-slate-700 text-emerald-950 dark:text-emerald-300 shadow-sm font-bold border border-emerald-700 dark:border-emerald-500'
                : 'text-slate-500 dark:text-slate-400 font-medium'
            }`}
          >
            <img src="https://flagcdn.com/w40/gb.png" alt="English" className="h-5 w-5 rounded-full object-cover shadow-sm" />
            <span className="text-xs">EN</span>
          </button>
        </div>

        {/* SWITCH MODO OSCURO */}
        <div className="flex items-center gap-2 bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 px-3 py-2 rounded-2xl shadow-sm backdrop-blur-md">
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
      </div>

      {/* CONTENEDOR PRINCIPAL DEL FORMULARIO */}
      <main className="relative z-10 w-full max-w-md rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 p-8 shadow-2xl shadow-blue-900/5 backdrop-blur-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <img src="/images/senda.png" alt="SENDA Logo" className="h-[55px] w-[55px] object-contain" />
          </div>
          <button
            onClick={onBackToFront}
            className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:text-sky-800 dark:hover:text-sky-300 transition cursor-pointer"
          >
            ← {t('Back to home', { defaultValue: 'Volver al inicio' })}
          </button>
        </div>

        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-950 dark:text-white">{t('Login')}</h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {role === 'admin' ? t('Admin Access') : (step === 1 ? t('Researcher Step 1') : t('Researcher Step 2'))}
          </p>
        </div>

        <form
          onSubmit={role === 'admin' ? handleAdminSubmit : handleResearcherSubmit}
          className="space-y-4"
          autoComplete="off"
        >
          <div className="space-y-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 p-4 shadow-sm">
            {role === 'admin' || step === 1 ? (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {role === 'admin' ? t('Admin User') : t('Researcher Email')}
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
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">{t('Temporary Code')}</label>
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
                  {t('Change Email or Code')}
                </button>
              </div>
            )}

            {role === 'admin' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">{t('Password')}</label>
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

          <div className="space-y-2 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 p-4 shadow-sm">
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{t('Role')}</p>
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
                {t('Researcher')}
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
                {t('Administrator')}
              </label>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center rounded-xl bg-sky-600 px-5 py-3 text-xs font-bold text-white transition hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-300 disabled:opacity-60 cursor-pointer shadow-lg shadow-sky-500/20"
            >
              {loading ? t('Processing') : (role === 'researcher' && step === 1 ? t('Request Code') : t('Access System'))}
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