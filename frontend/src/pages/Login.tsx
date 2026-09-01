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
    if (typeof window !== 'undefined') {
      return localStorage.getItem('senda_dark_mode') === 'true';
    }
    return false;
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
    <div
      className="
        relative min-h-screen w-full overflow-hidden font-sans
        transition-colors duration-500
        bg-senda-light dark:bg-senda-dark
        text-senda-main dark:text-senda-darktext
        flex items-center justify-center p-6
      "
    >
      {/* ======================================================
          CONTROLES SUPERIORES (Idioma y Modo)
          ====================================================== */}
      <div className="absolute top-6 right-6 z-20 flex items-center gap-3">
        <div className="hidden items-center rounded-full border border-[#D9E5DB] bg-white/70 p-1 dark:border-[#30453A] dark:bg-[#14221A]/80 sm:flex">
          <button
            onClick={() => i18n.changeLanguage('es')}
            className={`flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold transition-all ${
              i18n.language === 'es'
                ? 'bg-[#DCEBE1] text-[#1D5A3D] dark:bg-[#284738] dark:text-[#A9E1C0]'
                : 'text-[#75847A] dark:text-[#91A298]'
            }`}
          >
            <img src="https://flagcdn.com/w40/es.png" alt="Español" className="h-4 w-4 rounded-full object-cover" />
            ES
          </button>
          <button
            onClick={() => i18n.changeLanguage('en')}
            className={`flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold transition-all ${
              i18n.language === 'en'
                ? 'bg-[#DCEBE1] text-[#1D5A3D] dark:bg-[#284738] dark:text-[#A9E1C0]'
                : 'text-[#75847A] dark:text-[#91A298]'
            }`}
          >
            <img src="https://flagcdn.com/w40/gb.png" alt="English" className="h-4 w-4 rounded-full object-cover" />
            EN
          </button>
        </div>

        <button
          onClick={() => setDarkMode((value) => !value)}
          title={darkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-[#D9E5DB] bg-white/70 text-[#527062] transition-all hover:scale-105 dark:border-[#30453A] dark:bg-[#14221A] dark:text-[#A9D7B9]"
        >
          {darkMode ? (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
            </svg>
          ) : (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
              <circle cx="12" cy="12" r="4" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M4.93 19.07l-1.41 1.41M18.66 5.34l-1.41 1.41" />
            </svg>
          )}
        </button>
      </div>

      {/* ======================================================
          CONTENEDOR PRINCIPAL DEL FORMULARIO
          ====================================================== */}
      <main
        className="
          relative z-10 w-full max-w-md rounded-3xl
          border border-senda-border dark:border-senda-darkborder
          bg-white/95 dark:bg-senda-card/95
          p-8 shadow-xl backdrop-blur-xl space-y-5
        "
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <img
              src={darkMode ? '/images/senda-dark-sin.png' : '/images/senda-claro-sin.png'}
              alt="SENDA Logo"
              className="h-[75px] w-auto object-contain object-left"
            />
          </div>
          <button
            onClick={onBackToFront}
            className="text-xs font-semibold text-senda-primary dark:text-senda-accent hover:underline transition cursor-pointer"
          >
            ← {t('Back to home', { defaultValue: 'Volver al inicio' })}
          </button>
        </div>

        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-senda-main dark:text-senda-darktext" style={{ fontFamily: 'Fraunces, serif' }}>
            {t('Login')}
          </h1>
          <p className="mt-1 text-xs text-[#6B6F66] dark:text-[#9AA093]">
            {role === 'admin' ? t('Admin Access') : (step === 1 ? t('Researcher Step 1') : t('Researcher Step 2'))}
          </p>
        </div>

        <form
          onSubmit={role === 'admin' ? handleAdminSubmit : handleResearcherSubmit}
          className="space-y-4"
          autoComplete="off"
        >
          {/* Bloque de inputs */}
          <div className="space-y-3 rounded-2xl border border-senda-border dark:border-senda-darkborder bg-senda-light dark:bg-senda-input p-4 shadow-inner">
            {role === 'admin' || step === 1 ? (
              <div>
                <label className="block text-xs font-semibold text-senda-main dark:text-senda-darktext mb-1">
                  {role === 'admin' ? t('Admin User') : t('Researcher Email')}
                </label>
                <input
                  value={username}
                  onChange={(ev) => setUsername(ev.target.value)}
                  type={role === 'admin' ? 'text' : 'email'}
                  required
                  autoComplete="new-password"
                  placeholder={role === 'admin' ? t('Enter your username') : 'usuario@correo.com'}
                  className="
                    w-full rounded-xl border border-senda-border dark:border-senda-darkborder
                    bg-white dark:bg-senda-dark
                    py-3 px-4 text-xs text-senda-main dark:text-senda-darktext
                    shadow-sm outline-none transition focus:border-senda-secondary focus:ring-2 focus:ring-[#DCEBE1]
                  "
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-senda-main dark:text-senda-darktext mb-1">{t('Temporary Code')}</label>
                <input
                  value={otpCode}
                  onChange={(ev) => setOtpCode(ev.target.value)}
                  type="text"
                  required
                  autoComplete="new-password"
                  placeholder="123456"
                  className="
                    w-full rounded-xl border border-senda-border dark:border-senda-darkborder
                    bg-white dark:bg-senda-dark
                    py-3 px-4 text-xs text-senda-main dark:text-senda-darktext
                    shadow-sm outline-none transition focus:border-senda-secondary focus:ring-2 focus:ring-[#DCEBE1]
                    text-center tracking-widest font-mono text-base
                  "
                />
                <button
                  type="button"
                  onClick={() => { setStep(1); setOtpCode(''); setError(null); setInfoMessage(null); }}
                  className="mt-2 text-[11px] text-senda-primary dark:text-senda-accent hover:underline block text-right w-full cursor-pointer font-medium"
                >
                  {t('Change Email or Code')}
                </button>
              </div>
            )}

            {role === 'admin' && (
              <div>
                <label className="block text-xs font-semibold text-senda-main dark:text-senda-darktext mb-1">{t('Password')}</label>
                <input
                  value={password}
                  onChange={(ev) => setPassword(ev.target.value)}
                  type="password"
                  required
                  autoComplete="new-password"
                  placeholder="••••••••"
                  className="
                    w-full rounded-xl border border-senda-border dark:border-senda-darkborder
                    bg-white dark:bg-senda-dark
                    py-3 px-4 text-xs text-senda-main dark:text-senda-darktext
                    shadow-sm outline-none transition focus:border-senda-secondary focus:ring-2 focus:ring-[#DCEBE1]
                  "
                />
              </div>
            )}
          </div>

          {/* Selector de Rol */}
          <div className="space-y-2 rounded-2xl border border-senda-border dark:border-senda-darkborder bg-senda-light dark:bg-senda-input p-4 shadow-inner">
            <p className="text-xs font-semibold text-senda-main dark:text-senda-darktext">{t('Role')}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-senda-border dark:border-senda-darkborder bg-white dark:bg-senda-dark px-3 py-2.5 text-xs font-medium text-senda-main dark:text-senda-darktext shadow-sm transition hover:border-senda-secondary">
                <input
                  type="radio"
                  name="role"
                  value="researcher"
                  className="h-4 w-4 accent-senda-secondary"
                  checked={role === 'researcher'}
                  onChange={() => setRole('researcher')}
                />
                {t('Researcher')}
              </label>
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-senda-border dark:border-senda-darkborder bg-white dark:bg-senda-dark px-3 py-2.5 text-xs font-medium text-senda-main dark:text-senda-darktext shadow-sm transition hover:border-senda-secondary">
                <input
                  type="radio"
                  name="role"
                  value="admin"
                  className="h-4 w-4 accent-senda-secondary"
                  checked={role === 'admin'}
                  onChange={() => setRole('admin')}
                />
                {t('Administrator')}
              </label>
            </div>
          </div>

          {/* Botón de envío */}
          <div>
            <button
              type="submit"
              disabled={loading}
              className="
                inline-flex
                w-full
                items-center
                justify-center
                rounded-xl
                bg-senda-primary
                hover:bg-[#184232]
                dark:bg-senda-accent
                dark:text-senda-dark
                dark:hover:bg-[#59a67e]
                px-5
                py-3
                text-xs
                font-bold
                text-white
                transition
                focus:outline-none
                focus:ring-2
                focus:ring-senda-secondary
                disabled:opacity-60
                cursor-pointer
                shadow-md
              "
            >
              {loading ? t('Processing') : (role === 'researcher' && step === 1 ? t('Request Code') : t('Access System'))}
            </button>
            {infoMessage && <p className="mt-2 text-xs text-senda-secondary dark:text-senda-accent text-center font-medium">{infoMessage}</p>}
            {error && <p className="mt-2 text-xs text-red-500 dark:text-red-400 text-center font-medium">{error}</p>}
          </div>
        </form>

        <div className="border-t border-senda-border dark:border-senda-darkborder pt-4 text-center text-[11px] text-[#6B6F66] dark:text-[#9AA093]">
          <span>{t('FooterText')}</span>
        </div>
      </main>
    </div>
  );
};

export default Login;