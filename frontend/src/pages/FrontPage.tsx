import React, { useEffect, useState } from 'react';

const API_BASE = 'http://localhost:1574';

type FrontPageProps = {
  onGoToLogin: () => void;
};

const FrontPage: React.FC<FrontPageProps> = ({ onGoToLogin }) => {
  const [participantsCount, setParticipantsCount] = useState<number | null>(null);
  const [fitbitsCount, setFitbitsCount] = useState<number | null>(null);
  const [recordsCount, setRecordsCount] = useState<number | null>(null);

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
    <div className="h-screen w-screen overflow-hidden bg-gradient-to-br from-sky-700 via-sky-500 to-slate-400 text-white flex flex-col justify-between px-8 sm:px-16 py-6 sm:py-8">
      
      {/* Cabecera superior con logotipo y botón de Iniciar Sesión */}
      <div className="flex items-center justify-between w-full max-w-7xl mx-auto">
        <div className="flex items-center gap-3.5">
          <img src="/images/senda.png" alt="SENDA Logo" className="h-[65px] w-[65px] object-contain bg-white/10 rounded-2xl p-1 backdrop-blur-md shadow-sm" />
          <div>
            <p className="text-[26px] font-bold uppercase tracking-[0.2em] text-white">SENDA</p>
            <p className="text-[10px] uppercase tracking-[0.3em] text-slate-100/80">Salud · Neurociencia · Andalucía</p>
          </div>
        </div>

        <button
          onClick={onGoToLogin}
          className="inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-3 text-xs font-extrabold text-sky-700 shadow-xl shadow-slate-950/20 transition hover:bg-slate-100 hover:text-red-500 cursor-pointer"
        >
          <span>Iniciar sesión</span>
          <span className="text-sm font-bold">→</span>
        </button>
      </div>

      {/* Contenido principal central con espaciados equilibrados */}
      <div className="relative max-w-4xl mx-auto w-full text-center space-y-8 my-auto py-4">
        <div className="absolute -left-16 -top-12 h-56 w-56 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute -right-16 -bottom-12 h-56 w-56 rounded-full bg-white/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-4">
          <span className="inline-flex rounded-full bg-white/10 px-4 py-1.5 text-xs uppercase tracking-[0.24em] text-slate-100 backdrop-blur-md border border-white/20 shadow-sm">
            Universidad de Sevilla · Financiado por CENTRA
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl leading-snug sm:leading-tight">
            Salud Emocional y Neurociencia para el Desarrollo de Andalucía
          </h1>
          <p className="max-w-2xl mx-auto text-xs sm:text-sm text-slate-100/90 pt-1 font-medium">
            Proyecto del <strong className="text-white font-semibold">Departamento de Psicología Experimental y Psicología Social de la Universidad de Sevilla</strong>
          </p>
        </div>

        {/* Tarjetas de métricas en tiempo real */}
        <div className="relative z-10 grid gap-4 sm:grid-cols-3 max-w-2xl mx-auto pt-2">
          <div className="rounded-3xl border border-white/20 bg-white/10 p-5 shadow-xl shadow-slate-950/10 backdrop-blur-md text-center transition-transform hover:scale-105 duration-200">
            <p className="text-3xl font-extrabold">{participantsCount !== null ? participantsCount : '—'}</p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-200">Participantes</p>
          </div>
          <div className="rounded-3xl border border-white/20 bg-white/10 p-5 shadow-xl shadow-slate-950/10 backdrop-blur-md text-center transition-transform hover:scale-105 duration-200">
            <p className="text-3xl font-extrabold">{fitbitsCount !== null ? fitbitsCount : '—'}</p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-200">Fitbit registradas</p>
          </div>
          <div className="rounded-3xl border border-white/20 bg-white/10 p-5 shadow-xl shadow-slate-950/10 backdrop-blur-md text-center transition-transform hover:scale-105 duration-200">
            <p className="text-3xl font-extrabold">{recordsCount !== null ? recordsCount : '—'}</p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-200">Registros</p>
          </div>
        </div>
      </div>

      {/* Pie de página institucional */}
      <div className="flex flex-col sm:flex-row items-center justify-between w-full max-w-7xl mx-auto text-xs text-slate-200/80 border-t border-white/10 pt-4">
        <div className="flex items-center gap-2">
          <svg className="h-4 w-4 text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <span>Acceso protegido · Cumplimiento RGPD</span>
        </div>
        <p>© 2026 SENDA · Universidad de Sevilla / Fundación CENTRA</p>
      </div>

    </div>
  );
};

export default FrontPage;