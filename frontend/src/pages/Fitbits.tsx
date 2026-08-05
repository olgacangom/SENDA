import React, { useEffect, useState } from 'react';

const API_BASE = 'http://localhost:1574';

type FitbitItem = {
  fitbit_code: string;
  status: string;
};

const Fitbits: React.FC = () => {
  const [fitbits, setFitbits] = useState<FitbitItem[]>([]);
  const [summary, setSummary] = useState({ in_use: 0, free: 0, maintenance: 0, inactive: 0 });
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/fitbits/`, { credentials: 'include' })
      .then(async (res) => {
        if (!res.ok) throw new Error(await res.text());
        return res.json();
      })
      .then((data) => {
        setFitbits(data.items || []);
        setSummary(data.counts || { in_use: 0, free: 0, maintenance: 0, inactive: 0 });
      })
      .catch(() => setError('No se pudieron cargar las pulseras'));
  }, []);

  const filtered = fitbits.filter((fitbit) =>
    fitbit.fitbit_code.toLowerCase().includes(query.toLowerCase()) ||
    fitbit.status.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="w-full">
      {/* Cabecera de la sección */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900">Fitbit</h1>
          <p className="mt-1 text-xs font-medium text-slate-500">Consulta el estado actual de los dispositivos</p>
        </div>
        <button className="mt-4 sm:mt-0 inline-flex items-center justify-center px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-2xl shadow-lg shadow-blue-500/20 transition gap-2">
          <span>+ Registrar pulsera</span>
        </button>
      </div>

      {/* Tarjetas de resumen superior */}
      <div className="mb-8 grid gap-4 sm:grid-cols-4">
        {[
          { label: 'En uso', value: summary.in_use, color: 'text-emerald-600 border-emerald-100' },
          { label: 'Libres', value: summary.free, color: 'text-blue-600 border-blue-100' },
          { label: 'Mantenimiento', value: summary.maintenance, color: 'text-amber-600 border-amber-100' },
          { label: 'Inactivas', value: summary.inactive, color: 'text-slate-500 border-slate-100' },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-blue-200/80 bg-white p-5 shadow-xl shadow-blue-200/40 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl text-center"
          >
            <p className={`text-[11px] font-bold uppercase tracking-[0.25em] ${item.color.split(' ')[0]}`}>
              {item.label}
            </p>
            <p className="mt-2 text-3xl font-extrabold text-slate-900">{item.value}</p>
          </div>
        ))}
      </div>

      {/* Tarjeta contenedora de la tabla */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xl shadow-slate-200/40">

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
            placeholder="Buscar por código de pulsera o estado..."
            className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 py-3.5 pl-11 pr-4 text-xs text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
          />
        </div>

        <div className="overflow-hidden rounded-2xl">
          <div className="overflow-x-auto">
            <table className="min-w-full table-fixed border-collapse text-left">
              <thead>
                <tr className="bg-blue-50/60 text-blue-900 uppercase text-[10px] tracking-wider">
                  <th className="w-[50%] px-6 py-3.5 font-bold rounded-l-2xl">PULSERA</th>
                  <th className="w-[50%] px-6 py-3.5 font-bold rounded-r-2xl">ESTADO</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((fitbit) => {
                  const statusLower = fitbit.status.toLowerCase();
                  const badgeStyle = statusLower.includes('in_use') || statusLower.includes('uso')
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                    : statusLower.includes('free') || statusLower.includes('libre')
                      ? 'bg-blue-50 text-blue-700 border-blue-100'
                      : 'bg-amber-50 text-amber-700 border-amber-100';

                  return (
                    <tr 
                      key={fitbit.fitbit_code} 
                      className="border-b border-slate-200 last:border-b-0 hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="px-6 py-4 text-xs font-bold text-slate-900 flex items-center gap-3">
                        <div className="h-8 w-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center font-bold shadow-sm">
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                        </div>
                        {fitbit.fitbit_code}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-600 capitalize">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold border ${badgeStyle}`}>
                          <span className="h-1.5 w-1.5 rounded-full bg-current"></span>
                          {fitbit.status.replace('_', ' ').toLowerCase()}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {filtered.length === 0 && !error && (
          <p className="py-8 text-center text-xs text-slate-400">No se encontraron dispositivos.</p>
        )}
        {error && (
          <p className="py-8 text-center text-xs text-red-500">{error}</p>
        )}
      </div>
    </div>
  );
};

export default Fitbits;