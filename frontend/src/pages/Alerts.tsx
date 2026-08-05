import React, { useEffect, useState } from 'react';

type AlertItem = {
  id: string;
  message: string;
  priority: string;
  type: string;
  resolved: boolean;
  participant_code: string | null;
  email: string | null;
  created_at: string;
};

const API_BASE = 'http://localhost:1574';

const Alerts: React.FC = () => {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [query, setQuery] = useState('');
  const [selectedPriority, setSelectedPriority] = useState<string>('ALL');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/alerts/`, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => setAlerts(data.items || []))
      .catch(() => setError('No se pudieron cargar las alertas'));
  }, []);

  const handleResolve = (id: string) => {
    // Lógica opcional para marcar como resuelta de forma local o vía API
    setAlerts((prev) => prev.filter((item) => item.id !== id));
  };

  const filtered = alerts.filter((alert) => {
    const matchesQuery =
      alert.message.toLowerCase().includes(query.toLowerCase()) ||
      (alert.participant_code && alert.participant_code.toLowerCase().includes(query.toLowerCase())) ||
      (alert.email && alert.email.toLowerCase().includes(query.toLowerCase()));

    const matchesPriority =
      selectedPriority === 'ALL' || alert.priority === selectedPriority;

    return matchesQuery && matchesPriority;
  });

  const countHigh = alerts.filter((item) => item.priority === 'HIGH').length;
  const countMedium = alerts.filter((item) => item.priority === 'MEDIUM').length;
  const countLow = alerts.filter((item) => item.priority === 'LOW').length;

  return (
    <div className="w-full text-slate-900 space-y-8">
      
      {/* Cabecera de la sección */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900">Alertas</h1>
          <p className="mt-1 text-xs font-medium text-slate-500">Incidencias y anomalías detectadas automáticamente en el estudio.</p>
        </div>
      </div>

      {/* Tarjetas de métricas superiores interactivas */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div 
          onClick={() => setSelectedPriority('HIGH')}
          className={`cursor-pointer rounded-3xl border bg-white p-6 shadow-xl shadow-slate-200/40 transition-all hover:-translate-y-1 ${
            selectedPriority === 'HIGH' ? 'border-rose-500 ring-2 ring-rose-500/20' : 'border-slate-200/80'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.25em] text-rose-600">CRÍTICAS</p>
            <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse"></span>
          </div>
          <p className="mt-2 text-3xl font-extrabold text-slate-900">{countHigh}</p>
        </div>

        <div 
          onClick={() => setSelectedPriority('MEDIUM')}
          className={`cursor-pointer rounded-3xl border bg-white p-6 shadow-xl shadow-slate-200/40 transition-all hover:-translate-y-1 ${
            selectedPriority === 'MEDIUM' ? 'border-amber-500 ring-2 ring-amber-500/20' : 'border-slate-200/80'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.25em] text-amber-600">ADVERTENCIAS</p>
          </div>
          <p className="mt-2 text-3xl font-extrabold text-slate-900">{countMedium}</p>
        </div>

        <div 
          onClick={() => setSelectedPriority('LOW')}
          className={`cursor-pointer rounded-3xl border bg-white p-6 shadow-xl shadow-slate-200/40 transition-all hover:-translate-y-1 ${
            selectedPriority === 'LOW' ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-200/80'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.25em] text-blue-600">INFORMATIVAS</p>
          </div>
          <p className="mt-2 text-3xl font-extrabold text-slate-900">{countLow}</p>
        </div>
      </div>

      {/* Tarjeta contenedora de la bandeja de alertas */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xl shadow-slate-200/40">
        
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-700">Bandeja de alertas</p>
            <span className="inline-flex items-center px-3 py-1 rounded-xl text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
              {filtered.length} incidencias
            </span>
          </div>

          {/* Filtros rápidos por pestañas */}
          <div className="flex items-center gap-1.5 bg-slate-50 p-1.5 rounded-2xl border border-slate-200/60">
            <button
              onClick={() => setSelectedPriority('ALL')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition ${
                selectedPriority === 'ALL' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Todas
            </button>
            <button
              onClick={() => setSelectedPriority('HIGH')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition ${
                selectedPriority === 'HIGH' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Críticas
            </button>
            <button
              onClick={() => setSelectedPriority('MEDIUM')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition ${
                selectedPriority === 'MEDIUM' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Advertencias
            </button>
            <button
              onClick={() => setSelectedPriority('LOW')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition ${
                selectedPriority === 'LOW' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Informativas
            </button>
          </div>
        </div>

        {/* Barra de búsqueda interna con icono de lupa */}
        <div className="mb-6 relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-slate-400">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por mensaje, código de participante o correo..."
            className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 py-3.5 pl-11 pr-4 text-xs text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
          />
        </div>

        {/* Listado de alertas con indicador lateral */}
        <div className="space-y-3">
          {filtered.map((alert) => {
            const isHigh = alert.priority === 'HIGH';
            const isMedium = alert.priority === 'MEDIUM';

            const borderLeftColor = isHigh
              ? 'border-l-rose-500'
              : isMedium
                ? 'border-l-amber-500'
                : 'border-l-blue-500';

            const badgeStyle = isHigh
              ? 'bg-rose-50 text-rose-700 border-rose-200'
              : isMedium
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-blue-50 text-blue-700 border-blue-200';

            const dotColor = isHigh
              ? 'bg-rose-500'
              : isMedium
                ? 'bg-amber-500'
                : 'bg-blue-500';

            return (
              <div 
                key={alert.id} 
                className={`rounded-2xl border border-slate-200/80 border-l-4 ${borderLeftColor} bg-slate-50/40 p-5 transition hover:bg-white hover:shadow-md`}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-slate-200/70 text-slate-700">
                        {alert.participant_code || alert.email || 'Sistema'}
                      </span>
                      <span className="text-[11px] text-slate-400 font-medium">
                        {new Date(alert.created_at).toLocaleString('es-ES')}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-slate-900 pt-1">{alert.message}</p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold border shadow-sm ${badgeStyle}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`}></span>
                      {alert.priority}
                    </span>
                    <button 
                      onClick={() => handleResolve(alert.id)}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition shadow-sm"
                    >
                      Resolver
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && !error && (
          <p className="py-12 text-center text-xs text-slate-400">No se encontraron alertas registradas para este filtro.</p>
        )}
        {error && (
          <p className="py-12 text-center text-xs text-red-500">{error}</p>
        )}
      </div>
    </div>
  );
};

export default Alerts;