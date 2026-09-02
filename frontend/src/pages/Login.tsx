import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Brain3D } from '../components/Brain3D';

const API_BASE = 'http://localhost:1574';

type LoginProps = {
  onLogin: (
    page: 'participants' | 'assignments' | 'admin',
    role: 'researcher' | 'admin',
    email?: string
  ) => void;
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
    setInfoMessage(null);
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
          setError(json.error || 'Error al solicitar el código de acceso.');
          return;
        }
        setInfoMessage('Hemos enviado un código temporal a tu correo electrónico.');
        setStep(2);
      } else {
        const res = await fetch(`${API_BASE}/api/auth/researcher/verify-code/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: username, code: otpCode }),
          credentials: 'include',
        });
        const json = await res.json();
        if (!res.ok) {
          setError(json.error || 'El código es incorrecto o ha caducado.');
          return;
        }
        onLogin('assignments', 'researcher', username);
      }
    } catch (err) {
      setError('No se ha podido conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);
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
        setError(json.error || 'Las credenciales de administrador no son correctas.');
        return;
      }
      onLogin('participants', 'admin', username);
    } catch (err) {
      setError('No se ha podido conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  const accessDescription =
    role === 'admin'
      ? t('Admin Access')
      : step === 1
        ? t('Researcher Step 1')
        : t('Researcher Step 2');

  return (
    <div className="relative h-screen w-full overflow-hidden bg-[#F4F8F5] font-sans text-[#18352A] transition-colors duration-500 dark:bg-[#07100B] dark:text-[#E8F1EB] flex flex-col justify-between">
      {/* BACKGROUND ELEMENTS */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-[180px] -top-[180px] h-[500px] w-[500px] rounded-full bg-[#DDEDE2] opacity-70 blur-[100px] dark:bg-[#123A28] dark:opacity-35" />
        <div className="absolute -bottom-[200px] -right-[180px] h-[500px] w-[500px] rounded-full bg-[#E2F0E6] opacity-80 blur-[100px] dark:bg-[#0E3021] dark:opacity-40" />
        <div
          className="absolute inset-0 opacity-[0.035] dark:opacity-[0.045]"
          style={{
            backgroundImage: 'linear-gradient(#1D5A3D 1px, transparent 1px), linear-gradient(90deg, #1D5A3D 1px, transparent 1px)',
            backgroundSize: '45px 45px',
          }}
        />
      </div>

      {/* TOP CONTROLS */}
      <div className="fixed right-6 top-6 z-50 flex items-center gap-2 sm:right-10 sm:top-8">
        <div className="hidden items-center rounded-full border border-[#D6E2D9] bg-white/75 p-1 shadow-sm backdrop-blur-xl dark:border-[#2B4033] dark:bg-[#132019]/80 sm:flex">
          <button
            type="button"
            onClick={() => i18n.changeLanguage('es')}
            className={`flex h-7 cursor-pointer items-center gap-1.5 rounded-full px-3 text-[10px] font-bold transition-all ${i18n.language === 'es'
              ? 'bg-[#DCEBE1] text-[#1D5A3D] dark:bg-[#284738] dark:text-[#A9E1C0]'
              : 'text-[#718077] hover:text-[#315D46] dark:text-[#8FA197]'
              }`}
          >
            <img src="https://flagcdn.com/w40/es.png" alt="Español" className="h-3.5 w-3.5 rounded-full object-cover" />
            ES
          </button>
          <button
            type="button"
            onClick={() => i18n.changeLanguage('en')}
            className={`flex h-7 cursor-pointer items-center gap-1.5 rounded-full px-3 text-[10px] font-bold transition-all ${i18n.language === 'en'
              ? 'bg-[#DCEBE1] text-[#1D5A3D] dark:bg-[#284738] dark:text-[#A9E1C0]'
              : 'text-[#718077] hover:text-[#315D46] dark:text-[#8FA197]'
              }`}
          >
            <img src="https://flagcdn.com/w40/gb.png" alt="English" className="h-3.5 w-3.5 rounded-full object-cover" />
            EN
          </button>
        </div>

        <button
          type="button"
          onClick={() => setDarkMode((value) => !value)}
          title={darkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-[#D6E2D9] bg-white/80 text-[#527062] shadow-sm backdrop-blur-xl transition-all duration-300 hover:scale-105 dark:border-[#2B4033] dark:bg-[#132019]/85 dark:text-[#A9D7B9]"
        >
          {darkMode ? (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
            </svg>
          ) : (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
              <circle cx="12" cy="12" r="4" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41M18.66 5.34l-1.41 1.41" />
            </svg>
          )}
        </button>
      </div>

      {/* BACK TO HOME */}
      <button
        type="button"
        onClick={onBackToFront}
        className="fixed left-6 top-6 z-50 flex cursor-pointer items-center gap-2 rounded-full border border-[#D6E2D9] bg-white/75 px-3.5 py-2 text-xs font-semibold text-[#527062] shadow-sm backdrop-blur-xl transition-all duration-300 hover:border-[#A9C7B3] hover:text-[#1D5A3D] dark:border-[#2B4033] dark:bg-[#132019]/80 dark:text-[#A5B8AC] sm:left-10 sm:top-8"
      >
        <span className="text-sm leading-none">←</span>
        <span className="hidden sm:inline">
          {t('Back to home', { defaultValue: 'Volver al inicio' })}
        </span>
      </button>

      {/* MAIN CONTENT CONTAINER */}
      <main className="relative z-10 my-auto flex w-full max-w-[1560px] mx-auto items-center justify-center px-8 pt-20 pb-6 sm:px-12 sm:pt-24 lg:px-20">
        <div className="grid w-full items-center gap-16 lg:grid-cols-[1.2fr_0.8fr] xl:gap-28">

          {/* LEFT — SENDA / BRAIN */}
          <section className="relative hidden flex-col justify-center lg:flex min-h-[440px]">
            <div className="absolute inset-0 w-full h-full">
              <Brain3D />
            </div>
            <div className="relative z-10 max-w-[540px] pl-4 xl:pl-10 pt-4">
              <div className="mb-4 flex items-center gap-3">
                <h1
                  className="max-w-[540px] text-[36px] font-semibold leading-[1.1] tracking-[-0.035em] text-[#18352A] dark:text-[#EAF3ED] xl:text-[46px]"
                  style={{ fontFamily: 'Fraunces, serif' }}
                >
                  <span className="block text-[#397D59] dark:text-[#78C99A]">
                    SENDA
                  </span>
                </h1>
              </div>

              <div className="mt-5 flex flex-wrap gap-2.5">
                <div className="rounded-full border border-[#D5E2D9] bg-white/65 px-3.5 py-1 text-[11px] font-medium text-[#587065] backdrop-blur-md dark:border-[#2B4033] dark:bg-[#132019]/65 dark:text-[#9EB2A6]">
                  {t('Health')}
                </div>
                <div className="rounded-full border border-[#D5E2D9] bg-white/65 px-3.5 py-1 text-[11px] font-medium text-[#587065] backdrop-blur-md dark:border-[#2B4033] dark:bg-[#132019]/65 dark:text-[#9EB2A6]">
                  {t('Emotional')}
                </div>
                <div className="rounded-full border border-[#D5E2D9] bg-white/65 px-3.5 py-1 text-[11px] font-medium text-[#587065] backdrop-blur-md dark:border-[#2B4033] dark:bg-[#132019]/65 dark:text-[#9EB2A6]">
                  {t('Neuroscience')}
                </div>
                <div className="rounded-full border border-[#D5E2D9] bg-white/65 px-3.5 py-1 text-[11px] font-medium text-[#587065] backdrop-blur-md dark:border-[#2B4033] dark:bg-[#132019]/65 dark:text-[#9EB2A6]">
                  {t('Development')}
                </div>
                <div className="rounded-full border border-[#D5E2D9] bg-white/65 px-3.5 py-1 text-[11px] font-medium text-[#587065] backdrop-blur-md dark:border-[#2B4033] dark:bg-[#132019]/65 dark:text-[#9EB2A6]">
                  {t('Andalusia')}
                </div>
              </div>
            </div>
          </section>

          {/* RIGHT — LOGIN CARD  */}
          <section className="flex w-full justify-center lg:justify-start">
            <div className="w-full max-w-[440px]">
              <div className="rounded-[30px] border border-[#DCE7DF] bg-white/92 py-7 px-6 sm:py-8 sm:px-7 shadow-[0_20px_60px_rgba(29,90,61,0.08)] backdrop-blur-2xl dark:border-[#293D31] dark:bg-[#101B15]/92">
                {/* Header */}
                <div className="mb-4 flex items-center justify-between">
                  <div className="mr-auto">
                    <h2
                      className="text-[24px] font-semibold leading-[1.08] tracking-[-0.03em] text-[#18352A] dark:text-[#E8F1EB] sm:text-[28px]"
                      style={{ fontFamily: 'Fraunces, serif' }}
                    >
                      {t('Login')}
                    </h2>
                    <p className="mt-1 max-w-[260px] text-[12px] leading-relaxed text-[#718078] dark:text-[#9EAEA4]">
                      {accessDescription}
                    </p>
                  </div>
                  <div className="shrink-0">
                    <img
                      src={darkMode ? '/images/senda-dark-sin.png' : '/images/senda-claro-sin.png'}
                      alt="SENDA"
                      className="-ml-4 h-[68px] w-[78px] object-contain"
                    />
                  </div>
                </div>

                {/* ROLE SELECTOR */}
                <div className="mb-4">
                  <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-[#738078] dark:text-[#8E9E95]">
                    {t('Role')}
                  </p>
                  <div className="grid grid-cols-2 rounded-xl border border-[#DCE7DF] bg-[#F4F8F5] p-1 dark:border-[#2B4033] dark:bg-[#0D1711]">
                    <button
                      type="button"
                      onClick={() => setRole('researcher')}
                      className={`group flex cursor-pointer items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs font-semibold transition-all duration-300 ${role === 'researcher'
                        ? 'bg-white text-[#1D5A3D] shadow-sm dark:bg-[#1B2D23] dark:text-[#9BDCB6]'
                        : 'text-[#75837B] hover:text-[#365D47] dark:text-[#7F9086]'
                        }`}
                    >
                      {t('Researcher')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('admin')}
                      className={`group flex cursor-pointer items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs font-semibold transition-all duration-300 ${role === 'admin'
                        ? 'bg-white text-[#1D5A3D] shadow-sm dark:bg-[#1B2D23] dark:text-[#9BDCB6]'
                        : 'text-[#75837B] hover:text-[#365D47] dark:text-[#7F9086]'
                        }`}
                    >
                      {t('Administrator')}
                    </button>
                  </div>
                </div>

                {/* FORM */}
                <form
                  onSubmit={role === 'admin' ? handleAdminSubmit : handleResearcherSubmit}
                  className="space-y-3"
                  autoComplete="off"
                >
                  {role === 'researcher' && step === 2 ? (
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-[#345443] dark:text-[#C2D5C9]">
                        {t('Temporary Code')}
                      </label>
                      <input
                        value={otpCode}
                        onChange={(ev) => setOtpCode(ev.target.value.replace(/\D/g, '').slice(0, 6))}
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        required
                        autoComplete="one-time-code"
                        placeholder="000000"
                        className="w-full rounded-xl border border-[#D6E3DA] bg-[#F8FBF9] px-4 py-2.5 text-center font-mono text-[18px] font-semibold tracking-[0.3em] text-[#18352A] outline-none transition-all focus:border-[#63A982] focus:bg-white focus:ring-4 focus:ring-[#DCEBE1]/80 dark:border-[#2D4335] dark:bg-[#0C1610] dark:text-[#E6F0E9]"
                      />
                      <div className="mt-1.5 flex items-center justify-between">
                        <p className="text-[11px] text-[#89958E] dark:text-[#7F9087]">{username}</p>
                        <button
                          type="button"
                          onClick={() => { setStep(1); setOtpCode(''); setError(null); setInfoMessage(null); }}
                          className="cursor-pointer text-[11px] font-semibold text-[#397D59] hover:underline dark:text-[#82CDA0]"
                        >
                          {t('Change Email or Code')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-[#345443] dark:text-[#C2D5C9]">
                        {role === 'admin' ? t('Admin User') : t('Researcher Email')}
                      </label>
                      <input
                        value={username}
                        onChange={(ev) => setUsername(ev.target.value)}
                        type={role === 'admin' ? 'text' : 'email'}
                        required
                        autoComplete="off"
                        placeholder={role === 'admin' ? t('Enter your username') : 'investigador@universidad.es'}
                        className="w-full rounded-xl border border-[#D6E3DA] bg-[#F8FBF9] py-2.5 px-3.5 text-xs text-[#18352A] outline-none transition-all placeholder:text-[#A2AEA7] focus:border-[#63A982] focus:bg-white focus:ring-4 focus:ring-[#DCEBE1]/80 dark:border-[#2D4335] dark:bg-[#0C1610] dark:text-[#E6F0E9]"
                      />
                    </div>
                  )}

                  {role === 'admin' && (
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-[#345443] dark:text-[#C2D5C9]">
                        {t('Password')}
                      </label>
                      <input
                        value={password}
                        onChange={(ev) => setPassword(ev.target.value)}
                        type="password"
                        required
                        autoComplete="new-password"
                        placeholder="••••••••••"
                        className="w-full rounded-xl border border-[#D6E3DA] bg-[#F8FBF9] py-2.5 px-3.5 text-xs text-[#18352A] outline-none transition-all placeholder:text-[#A2AEA7] focus:border-[#63A982] focus:bg-white focus:ring-4 focus:ring-[#DCEBE1]/80 dark:border-[#2D4335] dark:bg-[#0C1610] dark:text-[#E6F0E9]"
                      />
                    </div>
                  )}

                  {infoMessage && (
                    <div className="flex items-start gap-2 rounded-xl border border-[#CDE3D4] bg-[#F0F8F2] px-3 py-2 dark:border-[#315640] dark:bg-[#13291D]">
                      <p className="text-[11px] leading-4 text-[#47725A] dark:text-[#9BCDAE]">{infoMessage}</p>
                    </div>
                  )}

                  {error && (
                    <div className="flex items-start gap-2 rounded-xl border border-[#E9CCCC] bg-[#FFF6F6] px-3 py-2 dark:border-[#573737] dark:bg-[#291818]">
                      <p className="text-[11px] leading-4 text-[#A05252] dark:text-[#E39B9B]">{error}</p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="group relative flex h-[44px] w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#1D5A3D] px-4 text-xs font-bold text-white shadow-md transition-all hover:bg-[#174A32] disabled:opacity-60 dark:bg-[#72C99B] dark:text-[#102018] dark:hover:bg-[#8BD7AC]"
                  >
                    {loading ? (
                      <>
                        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white dark:border-[#102018]/30 dark:border-t-[#102018]" />
                        <span>{t('Processing')}</span>
                      </>
                    ) : (
                      <>
                        <span>{role === 'researcher' && step === 1 ? t('Request Code') : t('Access System')}</span>
                        <span>→</span>
                      </>
                    )}
                  </button>
                </form>

                {/* SECURITY NOTE */}
                <div className="mt-4 flex items-center justify-center gap-2 border-t border-[#E3EBE5] pt-3 dark:border-[#293B30]">
                  <svg className="h-3.5 w-3.5 text-[#87938C] dark:text-[#7E9085]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span className="text-[10px] text-[#87938C] dark:text-[#7E9085]">{t('Secure Access')}</span>
                </div>
              </div>
            </div>
          </section>

        </div>
      </main>

    </div>
  );
};

export default Login;