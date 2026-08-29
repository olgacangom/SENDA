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
    return localStorage.getItem('senda_dark_mode') === 'true';
  });

  /* ============================================================
     MODO OSCURO
     ============================================================ */
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('senda_dark_mode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('senda_dark_mode', 'false');
    }
  }, [darkMode]);

  /* ============================================================
     CARGA DE MÉTRICAS
     ============================================================ */
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

        const activeAssignments = items.filter(
          (item: any) => item.status === 'ACTIVE'
        );

        setAssignmentsCount(activeAssignments.length);
      })
      .catch(() => setAssignmentsCount(null));
  }, []);

  return (
    <div
      className="
        relative
        min-h-screen
        w-full
        overflow-x-hidden
        bg-[#f5f8fc]
        font-sans
        text-slate-800
        transition-colors
        duration-300
        dark:bg-slate-950
        dark:text-slate-100
      "
    >

      {/* ==========================================================
          FONDOS DECORATIVOS
         ========================================================== */}

      <div
        className="
          pointer-events-none
          absolute
          right-[2%]
          top-[5%]
          h-[55vh]
          w-[48vw]
          max-h-[720px]
          max-w-[760px]
          rounded-full
          bg-blue-200/20
          blur-[100px]
          dark:bg-blue-900/10
        "
      />

      <div
        className="
          pointer-events-none
          absolute
          right-[10%]
          top-[13%]
          h-[38vh]
          w-[34vw]
          max-h-[520px]
          max-w-[600px]
          rounded-full
          bg-cyan-100/30
          blur-[80px]
          dark:bg-cyan-950/10
        "
      />

      {/* ==========================================================
          CEREBRO
         ========================================================== */}

      <div
        className="
          pointer-events-none
          absolute
          right-[0%]
          top-[8%]
          z-0
          w-[46vw]
          max-w-[780px]
          min-w-[420px]
          select-none
        "
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
          className="
            block
            h-auto
            w-full
            object-contain
            opacity-90
            mix-blend-darken
            dark:mix-blend-luminosity
          "
        />
      </div>

      {/* ==========================================================
          VELO DE TRANSICIÓN LATERAL
         ========================================================== */}

      <div
        className="
          pointer-events-none
          absolute
          inset-0
          z-[1]
          bg-[linear-gradient(90deg,#f5f8fc_0%,rgba(245,248,252,0.98)_25%,rgba(245,248,252,0.6)_48%,transparent_75%)]
          dark:bg-[linear-gradient(90deg,#020617_0%,rgba(2,6,23,0.96)_28%,rgba(2,6,23,0.45)_52%,transparent_78%)]
        "
      />

      {/* ==========================================================
          CONTROLES SUPERIORES
         ========================================================== */}

      <div
        className="
          absolute
          right-4
          top-4
          z-30
          flex
          items-center
          gap-2
          sm:right-6
          sm:top-6
          sm:gap-3
          lg:right-14
        "
      >

        {/* --------------------------------------------------------
            SELECTOR DE IDIOMA
           -------------------------------------------------------- */}

        <div
          className="
            flex
            items-center
            rounded-[25px]
            border
            border-slate-200
            bg-white/90
            p-0.5
            shadow-sm
            backdrop-blur-md
            dark:border-slate-700
            dark:bg-slate-900/90
          "
        >
          {/* ESPAÑOL */}

          <button
            onClick={() => i18n.changeLanguage('es')}
            className={`
              flex
              h-7
              items-center
              justify-center
              gap-1.5
              rounded-[22px]
              px-2
              cursor-pointer
              transition-all
              duration-300
              ${
                i18n.language === 'es'
                  ? 'border border-emerald-700 bg-white font-bold text-emerald-950 shadow-sm dark:border-emerald-500 dark:bg-slate-700 dark:text-emerald-300'
                  : 'font-medium text-slate-500 dark:text-slate-400'
              }
            `}
          >
            <img
              src="https://flagcdn.com/w40/es.png"
              alt="Español"
              className="
                h-5
                w-5
                rounded-full
                object-cover
                shadow-sm
              "
            />

            <span className="text-xs">
              ES
            </span>
          </button>

          {/* INGLÉS */}

          <button
            onClick={() => i18n.changeLanguage('en')}
            className={`
              flex
              h-7
              flex-row-reverse
              items-center
              justify-center
              gap-1.5
              rounded-[22px]
              px-2
              cursor-pointer
              transition-all
              duration-300
              ${
                i18n.language === 'en'
                  ? 'border border-emerald-700 bg-white font-bold text-emerald-950 shadow-sm dark:border-emerald-500 dark:bg-slate-700 dark:text-emerald-300'
                  : 'font-medium text-slate-500 dark:text-slate-400'
              }
            `}
          >
            <img
              src="https://flagcdn.com/w40/gb.png"
              alt="English"
              className="
                h-5
                w-5
                rounded-full
                object-cover
                shadow-sm
              "
            />

            <span className="text-xs">
              EN
            </span>
          </button>
        </div>

        {/* --------------------------------------------------------
            MODO OSCURO
           -------------------------------------------------------- */}

        <div
          className="
            hidden
            items-center
            gap-2
            rounded-2xl
            border
            border-slate-200/80
            bg-white/90
            px-3
            py-2
            shadow-sm
            backdrop-blur-md
            dark:border-slate-800
            dark:bg-slate-900/90
            sm:flex
          "
        >
          <span
            className="
              text-[11px]
              font-semibold
              text-slate-500
              dark:text-slate-400
            "
          >
            {darkMode ? 'Modo Oscuro' : 'Modo Claro'}
          </span>

          <button
            onClick={() => setDarkMode(!darkMode)}
            title={
              darkMode
                ? 'Cambiar a modo claro'
                : 'Cambiar a modo oscuro'
            }
            className="
              relative
              inline-flex
              h-6
              w-11
              shrink-0
              cursor-pointer
              items-center
              rounded-full
              bg-slate-300
              transition-colors
              duration-200
              ease-in-out
              focus:outline-none
              dark:bg-amber-500
            "
          >
            <span
              className={`
                pointer-events-none
                inline-block
                h-5
                w-5
                transform
                rounded-full
                bg-white
                shadow-lg
                transition
                duration-200
                ease-in-out
                ${
                  darkMode
                    ? 'translate-x-5'
                    : 'translate-x-0'
                }
              `}
            />
          </button>
        </div>

        {/* --------------------------------------------------------
            LOGIN
           -------------------------------------------------------- */}

        <button
          onClick={onGoToLogin}
          className="
            group
            inline-flex
            items-center
            gap-2
            rounded-2xl
            border
            border-slate-200/80
            bg-white/90
            px-4
            py-2.5
            text-[11px]
            font-bold
            text-slate-700
            shadow-[0_7px_25px_rgba(30,64,175,0.08)]
            backdrop-blur-md
            transition
            hover:-translate-y-0.5
            hover:border-blue-200
            hover:text-blue-600
            cursor-pointer
            dark:border-slate-800
            dark:bg-slate-900
            dark:text-slate-200
            dark:hover:text-blue-400
            sm:px-5
          "
        >
          <span>
            {t('Login')}
          </span>

          <span
            className="
              text-sm
              transition-transform
              group-hover:translate-x-1
            "
          >
            →
          </span>
        </button>
      </div>

      {/* ==========================================================
          CONTENIDO PRINCIPAL
         ========================================================== */}

      <div
        className="
          relative
          z-10
          mx-auto
          flex
          min-h-screen
          w-full
          max-w-[1600px]
          flex-col
          px-5
          pb-5
          pt-2
          sm:px-8
          sm:pb-6
          sm:pt-3
          lg:px-12
          lg:pb-7
          lg:pt-4
          xl:px-14
        "
      >

        {/* ========================================================
            HEADER / LOGO
           ======================================================== */}

        <header
          className="
            flex
            w-full
            max-w-[1400px]
            items-center
            pt-1
            sm:pt-2
          "
        >
          <div className="flex items-center">

            <div
              className="
                flex
                h-[78px]
                items-center
                justify-center
                sm:h-[88px]
                lg:h-[96px]
                xl:h-[102px]
                2xl:h-[108px]
              "
            >
              <img
                src={
                  darkMode
                    ? '/images/senda-dark-sin.png'
                    : '/images/senda-claro-sin.png'
                }
                alt="SENDA"
                className="
                  h-full
                  w-auto
                  max-w-[260px]
                  object-contain
                  sm:max-w-[290px]
                  lg:max-w-[320px]
                  xl:max-w-[340px]
                  2xl:max-w-[360px]
                "
              />
            </div>

          </div>
        </header>

        {/* ========================================================
            HERO
           ======================================================== */}

        <main
          className="
            flex
            w-full
            max-w-[1400px]
            flex-1
            items-start
          "
        >

          <section
            className="
              w-full
              max-w-[800px]
              pt-5
              pb-6
              sm:pt-7
              lg:pt-10
              xl:pt-14
              2xl:pt-16
            "
          >

            {/* ====================================================
                UNIVERSIDAD
               ==================================================== */}

            <div className="mb-5 sm:mb-6">

              <span
                className="
                  inline-flex
                  rounded-full
                  border
                  border-blue-100
                  bg-blue-50/70
                  px-4
                  py-1.5
                  text-[9px]
                  font-bold
                  uppercase
                  tracking-[0.22em]
                  text-blue-700
                  shadow-sm
                  dark:border-blue-900
                  dark:bg-blue-950/60
                  dark:text-blue-300
                "
              >
                {t('FrontCardTitle')}
              </span>

            </div>

            {/* ====================================================
                TÍTULO
               ==================================================== */}

            <h1
              className="
                max-w-[800px]
                text-[2rem]
                font-black
                leading-[1.08]
                tracking-[-0.035em]
                text-[#17223a]
                dark:text-white
                sm:text-[2.15rem]
                lg:text-[2.35rem]
                xl:text-[2.7rem]
                2xl:text-[3rem]
              "
            >
              {t('Main Title Line 1')}

              <br />

              {t('Main Title Line 2')}

              <br />

              <span className="text-[#254A9C] dark:text-blue-400">
                {t('Main Title Line 3')}
              </span>
            </h1>

            {/* ====================================================
                DESCRIPCIÓN
               ==================================================== */}

            <p
              className="
                mt-5
                max-w-[720px]
                text-[13px]
                font-medium
                leading-6
                text-slate-600
                dark:text-slate-300
                sm:mt-6
                sm:text-sm
              "
            >
              {t('Subtitle')}
            </p>

            {/* ====================================================
                MÉTRICAS
               ==================================================== */}

            <div
              className="
                mt-10
                grid
                w-full
                max-w-[800px]
                grid-cols-1
                gap-3
                sm:mt-11
                sm:grid-cols-3
                lg:mt-12
                xl:mt-13
                2xl:mt-14
              "
            >

              {/* ==================================================
                  PARTICIPANTES
                 ================================================== */}

              <div
                className="
                  flex
                  min-h-[76px]
                  items-center
                  gap-3
                  rounded-[20px]
                  border
                  border-blue-200/80
                  bg-white/80
                  px-4
                  py-3.5
                  shadow-[0_8px_25px_rgba(30,64,175,0.055)]
                  backdrop-blur-md
                  transition
                  hover:-translate-y-1
                  hover:bg-white
                  dark:border-slate-800
                  dark:bg-slate-900/90
                  dark:hover:bg-slate-900
                "
              >
                <div
                  className="
                    flex
                    h-10
                    w-10
                    shrink-0
                    items-center
                    justify-center
                    rounded-xl
                    bg-blue-50
                    text-blue-600
                    dark:bg-blue-950
                    dark:text-blue-400
                  "
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                </div>

                <div className="min-w-0">
                  <p
                    className="
                      text-xl
                      font-black
                      leading-none
                      text-[#17223a]
                      dark:text-white
                    "
                  >
                    {participantsCount !== null
                      ? participantsCount
                      : '—'}
                  </p>

                  <p
                    className="
                      mt-1.5
                      text-[9px]
                      font-extrabold
                      uppercase
                      tracking-[0.14em]
                      text-slate-400
                    "
                  >
                    {t('Registered Participants')}
                  </p>
                </div>
              </div>

              {/* ==================================================
                  FITBITS
                 ================================================== */}

              <div
                className="
                  flex
                  min-h-[76px]
                  items-center
                  gap-3
                  rounded-[20px]
                  border
                  border-blue-200/80
                  bg-white/80
                  px-4
                  py-3.5
                  shadow-[0_8px_25px_rgba(30,64,175,0.055)]
                  backdrop-blur-md
                  transition
                  hover:-translate-y-1
                  hover:bg-white
                  dark:border-slate-800
                  dark:bg-slate-900/90
                  dark:hover:bg-slate-900
                "
              >
                <div
                  className="
                    flex
                    h-10
                    w-10
                    shrink-0
                    items-center
                    justify-center
                    rounded-xl
                    bg-emerald-50
                    text-emerald-600
                    dark:bg-emerald-950
                    dark:text-emerald-400
                  "
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>

                <div className="min-w-0">
                  <p
                    className="
                      text-xl
                      font-black
                      leading-none
                      text-[#17223a]
                      dark:text-white
                    "
                  >
                    {fitbitsCount !== null
                      ? fitbitsCount
                      : '—'}
                  </p>

                  <p
                    className="
                      mt-1.5
                      text-[9px]
                      font-extrabold
                      uppercase
                      tracking-[0.14em]
                      text-slate-400
                    "
                  >
                    {t('Registered Fitbits')}
                  </p>
                </div>
              </div>

              {/* ==================================================
                  ASIGNACIONES
                 ================================================== */}

              <div
                className="
                  flex
                  min-h-[76px]
                  items-center
                  gap-3
                  rounded-[20px]
                  border
                  border-blue-200/80
                  bg-white/80
                  px-4
                  py-3.5
                  shadow-[0_8px_25px_rgba(30,64,175,0.055)]
                  backdrop-blur-md
                  transition
                  hover:-translate-y-1
                  hover:bg-white
                  dark:border-slate-800
                  dark:bg-slate-900/90
                  dark:hover:bg-slate-900
                "
              >
                <div
                  className="
                    flex
                    h-10
                    w-10
                    shrink-0
                    items-center
                    justify-center
                    rounded-xl
                    bg-indigo-50
                    text-indigo-600
                    dark:bg-indigo-950
                    dark:text-indigo-400
                  "
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                    />
                  </svg>
                </div>

                <div className="min-w-0">
                  <p
                    className="
                      text-xl
                      font-black
                      leading-none
                      text-[#17223a]
                      dark:text-white
                    "
                  >
                    {assignmentsCount !== null
                      ? assignmentsCount
                      : '—'}
                  </p>

                  <p
                    className="
                      mt-1.5
                      text-[9px]
                      font-extrabold
                      uppercase
                      tracking-[0.14em]
                      text-slate-400
                    "
                  >
                    {t('Assignments')}
                  </p>
                </div>
              </div>

            </div>
          </section>
        </main>

        {/* ========================================================
            FOOTER
           ======================================================== */}

        <footer
          className="
            mt-auto
            flex
            w-full
            max-w-[1400px]
            flex-col
            gap-2
            border-t
            border-slate-200/70
            pt-3
            text-[10px]
            text-slate-500
            dark:border-slate-800
            dark:text-slate-400
            sm:flex-row
            sm:items-center
            sm:justify-between
          "
        >
          <div className="flex items-center gap-2 font-medium">
            <svg
              className="h-4 w-4 text-emerald-600 dark:text-emerald-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>

            <span>
              {t('Secure Access')}
            </span>
          </div>

          <p className="font-medium">
            {t('FooterText')}
          </p>
        </footer>
      </div>
    </div>
  );
};

export default FrontPage;