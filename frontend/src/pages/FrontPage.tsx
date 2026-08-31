import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

const API_BASE = 'http://localhost:1574';

type FrontPageProps = {
  onGoToLogin: () => void;
};

const FrontPage: React.FC<FrontPageProps> = ({ onGoToLogin }) => {
  const { t, i18n } = useTranslation();

  const [participantsCount, setParticipantsCount] = useState<number | null>(null);
  const [fitbitsCount, setFitbitsCount] = useState<number | null>(null);
  const [assignmentsCount, setAssignmentsCount] = useState<number | null>(null);

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
    fetch(`${API_BASE}/api/participants/`)
      .then((r) => r.json())
      .then((data) => setParticipantsCount(data.count))
      .catch(() => setParticipantsCount(null));

    fetch(`${API_BASE}/api/fitbits/`)
      .then((r) => r.json())
      .then((data) => setFitbitsCount(data.count))
      .catch(() => setFitbitsCount(null));

    fetch(`${API_BASE}/api/assignments/`)
      .then((r) => r.json())
      .then((data) => {
        const items = data.items || data || [];
        const activeAssignments = items.filter((item: any) => item.status === 'ACTIVE');
        setAssignmentsCount(activeAssignments.length);
      })
      .catch(() => setAssignmentsCount(null));
  }, []);

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'es' ? 'en' : 'es');
  };

  return (
    <div
      className="
        min-h-screen
        w-full
        overflow-x-hidden
        font-sans
        transition-colors
        duration-500
        bg-senda-light dark:bg-senda-dark
        text-senda-main dark:text-senda-darktext
        flex
        flex-col
        justify-between
      "
    >
      {/* ======================================================
          NAVEGACIÓN
          ====================================================== */}
      <nav
        className="
          w-full flex items-center justify-between
          px-6 py-6 sm:px-12 sm:py-[26px] lg:px-16
        "
      >
        {/* Logo Block */}
        <div className="flex items-center gap-3">
          <img
            src={darkMode ? '/images/senda-dark-sin.png' : '/images/senda-claro-sin.png'}
            alt="SENDA Logo"
            className="h-[80px] w-auto object-contain object-left"
          />
        </div>

        {/* CONTROLES SUPERIORES (Barra unificada: ES | EN | Modo Claro/Oscuro) */}
        <div className="flex items-center gap-3">
          <div
            className="
              flex
              h-10
              items-center
              gap-3
              rounded-full
              border
              border-senda-border
              bg-white/90
              px-4
              shadow-sm
              backdrop-blur-md
              dark:border-senda-darkborder
              dark:bg-senda-card/90
            "
          >
            {/* BOTÓN ESPAÑOL */}
            <button
              onClick={() => i18n.changeLanguage('es')}
              className={`
                flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs transition-all cursor-pointer
                ${i18n.language === 'es'
                  ? 'bg-[#DCEBE1] dark:bg-senda-darkborder font-bold text-senda-main dark:text-white shadow-sm border border-senda-border dark:border-[#3E8563]'
                  : 'font-medium text-[#6B6F66] dark:text-[#9AA093] hover:opacity-80 px-1.5'
                }
              `}
            >
              <img src="https://flagcdn.com/w40/es.png" alt="Español" className="h-4 w-4 rounded-full object-cover shadow-sm" />
              <span>ES</span>
            </button>

            <span className="h-4 w-[1px] bg-senda-border dark:bg-senda-darkborder" />

            {/* BOTÓN INGLÉS */}
            <button
              onClick={() => i18n.changeLanguage('en')}
              className={`
                flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs transition-all cursor-pointer
                ${i18n.language === 'en'
                  ? 'bg-[#DCEBE1] dark:bg-senda-darkborder font-bold text-senda-main dark:text-white shadow-sm border border-senda-border dark:border-[#3E8563]'
                  : 'font-medium text-[#6B6F66] dark:text-[#9AA093] hover:opacity-80 px-1.5'
                }
              `}
            >
              <img src="https://flagcdn.com/w40/gb.png" alt="English" className="h-4 w-4 rounded-full object-cover shadow-sm" />
              <span>EN</span>
            </button>

            {/* SWITCH DE MODO */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-[#6B6F66] dark:text-[#9AA093]">
                {darkMode ? t('Dark Mode') || 'Modo Oscuro' : t('Light Mode') || 'Modo Claro'}
              </span>

              <button
                onClick={() => setDarkMode(!darkMode)}
                title={darkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
                className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full bg-senda-border dark:bg-senda-accent transition-colors duration-200 ease-in-out focus:outline-none"
              >
                <span
                  className={`
                    pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out
                    ${darkMode ? 'translate-x-5' : 'translate-x-0'}
                  `}
                />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* ======================================================
          CONTENIDO PRINCIPAL
          ====================================================== */}
      <div className="w-full flex-1 px-6 sm:px-12 lg:px-16 py-1">

        {/* SECCIÓN HERO */}
        <header
          className="
            w-full grid grid-cols-1 lg:grid-cols-2 gap-8 items-center
            overflow-hidden rounded-[28px] px-6 py-8 sm:px-12 sm:py-12
            bg-[linear-gradient(180deg,#EAF1EA_0%,var(--bg-senda-light)_100%)]
            dark:bg-[linear-gradient(180deg,#1B2A20_0%,var(--bg-senda-dark)_100%)]
          "
        >
          <div className="hero-copy">
            <span
              className="
                inline-block rounded-full px-3.5 py-1.5 text-[12px] font-semibold
                tracking-[0.02em]
                border border-[#8DC29A]
                bg-[#DCEBE1] text-senda-primary
                dark:bg-[rgba(111,190,150,0.14)] dark:text-senda-accent
              "
            >
              {t('FrontCardTitle')}
            </span>
            <h1
              className="
                mt-4 font-serif text-3xl sm:text-4xl lg:text-[40px] font-semibold leading-tight
                text-senda-main dark:text-senda-darktext
              "
              style={{ fontFamily: 'Fraunces, serif' }}
            >
              {t('Main Title Line 1')}<br />
              {t('Main Title Line 2')}<br />
              <span className="text-senda-secondary dark:text-senda-accent">{t('Main Title Line 3')}</span>
            </h1>
            <p
              className="
                mt-[16px] max-w-[500px] text-[15.5px] leading-[1.65]
                text-[#6B6F66] dark:text-[#9AA093]
              "
            >
              {t('Subtitle')}
            </p>
            <div className="hero-actions mt-[26px] flex flex-wrap gap-3.5">
              <button
                onClick={onGoToLogin}
                className="
                  flex h-[42px] items-center gap-1.5 rounded-[21px] px-5 text-[14px]
                  font-semibold transition-colors text-white cursor-pointer
                  bg-senda-primary hover:bg-[#184232]
                  dark:bg-senda-accent dark:text-[#0F1712] dark:hover:bg-[#59a67e]
                "
              >
                {t('Login')} →
              </button>
            </div>
          </div>

          {/* Columna Derecha Hero (Cerebro alineado a la derecha) */}
          <div className="hero-art relative flex items-center justify-center lg:justify-end mt-6 lg:mt-0">
            <img
              src="images/cerebro-claro.png"
              alt="Cerebro Neurociencia Claro"
              className="
                w-full max-w-[380px] h-auto object-contain
                block dark:hidden
                [mask-image:radial-gradient(circle,black_40%,transparent_80%)]
                [-webkit-mask-image:radial-gradient(circle,black_40%,transparent_80%)]
              "
            />
            <img
              src="images/cerebro-oscuro.png"
              alt="Cerebro Neurociencia Oscuro"
              className="
                w-full max-w-[380px] h-auto object-contain
                hidden dark:block
                [mask-image:radial-gradient(circle,black_40%,transparent_80%)]
                [-webkit-mask-image:radial-gradient(circle,black_40%,transparent_80%)]
              "
            />
          </div>
        </header>

        {/* SECCIÓN STATS */}
        <section className="mt-5 grid gap-4 sm:grid-cols-3">
          {/* Card 1 */}
          <div className="flex items-center gap-4 rounded-2xl p-5 border transition-colors border-senda-border bg-white dark:border-senda-darkborder dark:bg-senda-card shadow-sm">
            <div className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl bg-[#EAF1EA] dark:bg-senda-primary">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-senda-secondary dark:text-senda-accent" strokeWidth="1.8">
                <circle cx="9" cy="8" r="3.2" />
                <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
                <circle cx="17" cy="9" r="2.4" />
                <path d="M22 20c0-2.5-1.8-4.6-4.2-5.3" />
              </svg>
            </div>
            <div>
              <div className="font-serif text-[24px] font-semibold text-senda-main dark:text-senda-darktext" style={{ fontFamily: 'Fraunces, serif' }}>
                {participantsCount !== null ? participantsCount : '—'}
              </div>
              <div className="mt-[2px] text-[11.5px] uppercase tracking-[0.03em] text-[#6B6F66] dark:text-[#9AA093]">
                {t('Registered Participants')}
              </div>
              <div className="mt-[1px] text-[12px] text-[#6B6F66] dark:text-[#9AA093]">
                {t('Active in study') || 'Activos en el estudio'}
              </div>
            </div>
          </div>

          {/* Card 2 */}
          <div className="flex items-center gap-4 rounded-2xl p-5 border transition-colors border-senda-border bg-white dark:border-senda-darkborder dark:bg-senda-card shadow-sm">
            <div className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl bg-[#EAF1EA] dark:bg-senda-primary">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-senda-secondary dark:text-senda-accent" strokeWidth="1.8">
                <rect x="7" y="4" width="10" height="16" rx="4" />
                <path d="M12 8v4l2 2" />
              </svg>
            </div>
            <div>
              <div className="font-serif text-[24px] font-semibold text-senda-main dark:text-senda-darktext" style={{ fontFamily: 'Fraunces, serif' }}>
                {fitbitsCount !== null ? fitbitsCount : '—'}
              </div>
              <div className="mt-[2px] text-[11.5px] uppercase tracking-[0.03em] text-[#6B6F66] dark:text-[#9AA093]">
                {t('Registered Fitbits')}
              </div>
              <div className="mt-[1px] text-[12px] text-[#6B6F66] dark:text-[#9AA093]">
                {t('Connected devices') || 'Dispositivos conectados'}
              </div>
            </div>
          </div>

          {/* Card 3 */}
          <div className="flex items-center gap-4 rounded-2xl p-5 border transition-colors border-senda-border bg-white dark:border-senda-darkborder dark:bg-senda-card shadow-sm">
            <div className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl bg-[#EAF1EA] dark:bg-senda-primary">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-senda-secondary dark:text-senda-accent" strokeWidth="1.8">
                <rect x="5" y="4" width="14" height="17" rx="2" />
                <path d="M9 3h6v3H9z" />
                <path d="M9 12h6M9 16h4" />
              </svg>
            </div>
            <div>
              <div className="font-serif text-[24px] font-semibold text-senda-main dark:text-senda-darktext" style={{ fontFamily: 'Fraunces, serif' }}>
                {assignmentsCount !== null ? assignmentsCount : '—'}
              </div>
              <div className="mt-[2px] text-[11.5px] uppercase tracking-[0.03em] text-[#6B6F66] dark:text-[#9AA093]">
                {t('Assignments')}
              </div>
              <div className="mt-[1px] text-[12px] text-[#6B6F66] dark:text-[#9AA093]">
                {t('Active protocol') || 'Protocolo activo'}
              </div>
            </div>
          </div>
        </section>

        {/* SECCIÓN INFERIOR */}
        <section className="mt-6 mb-10 grid gap-4 lg:grid-cols-2">

          {/* COLUMNA 1: Sobre SENDA */}
          <div className="rounded-2xl p-6 sm:p-7 border border-senda-border bg-white dark:border-senda-darkborder dark:bg-senda-card shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-semibold font-serif text-senda-main dark:text-senda-darktext" style={{ fontFamily: 'Fraunces, serif' }}>
                {t('About SENDA') || 'Sobre SENDA'}
              </h3>
              <p className="mt-2 text-[13.5px] leading-relaxed text-[#6B6F66] dark:text-[#9AA093]">
                {t('About SENDA text') || 'SENDA es un proyecto de investigación impulsado por el Departamento de Psicología Experimental y Psicología Social de la Universidad de Sevilla, financiado por la Fundación CENTRA.'}
              </p>
            </div>
          </div>

          {/* COLUMNA 2: Logo Institucional */}
          <div className="rounded-2xl p-4 sm:p-6 border border-senda-border bg-white dark:border-senda-darkborder dark:bg-senda-card shadow-sm flex items-center justify-start pl-6 sm:pl-8 overflow-hidden min-h-[180px]">
            <a
              href="https://psicologia.us.es/investigacion"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full h-full flex items-center justify-start group"
            >
              <img
                src="images/facultad-logo.png"
                alt="Facultad de Psicología Universidad de Sevilla"
                className="max-h-24 w-auto object-contain transition-transform duration-300 group-hover:scale-105 opacity-90 hover:opacity-100"
              />
            </a>
          </div>

        </section>

      </div>

      {/* ======================================================
          PIE DE PÁGINA
          ====================================================== */}
      <footer
        className="
          w-full flex flex-col sm:flex-row items-center justify-between
          border-t px-6 sm:px-12 lg:px-16 py-6 text-[12.5px]
          border-senda-border text-[#6B6F66]
          dark:border-senda-darkborder dark:text-[#9AA093]
          gap-3 text-center sm:text-left
        "
      >
        <div className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 3l7 3v6c0 4.5-3 7.7-7 9-4-1.3-7-4.5-7-9V6l7-3Z" />
          </svg>
          {t('Secure Access')}
        </div>
        <span>{t('FooterText')}</span>
      </footer>
    </div>
  );
};

export default FrontPage;