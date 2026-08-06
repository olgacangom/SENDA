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

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [nextCode, setNextCode] = useState('F_001');
  const [selectedStatus, setSelectedStatus] = useState('FREE');
  const [submitting, setSubmitting] = useState(false);

  const loadFitbits = () => {
    fetch(`${API_BASE}/api/fitbits/`, { credentials: 'include' })
      .then(async (res) => {
        if (!res.ok) throw new Error(await res.text());
        return res.json();
      })
      .then((data) => {
        const items = data.items || [];
        setFitbits(items);
        setSummary(data.counts || { in_use: 0, free: 0, maintenance: 0, inactive: 0 });

        // Calcular automáticamente el siguiente código (ej. F_004 a partir de F_003)
        if (items.length > 0) {
          const codes = items.map((f: FitbitItem) => {
            const match = f.fitbit_code.match(/F_(\d+)/);
            return match ? parseInt(match[1], 10) : 0;
          });
          const maxNum = Math.max(...codes, 0);
          setNextCode(`F_${String(maxNum + 1).padStart(3, '0')}`);
        } else {
          setNextCode('F_001');
        }
      })
      .catch(() => setError('No se pudieron cargar las pulseras'));
  };

  useEffect(() => {
    loadFitbits();
  }, []);

  // Función para registrar la nueva pulsera
  const handleCreateFitbit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/api/fitbits/create/`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fitbit_code: nextCode, status: selectedStatus }),
      });

      if (!response.ok) {
        throw new Error('No se pudo registrar la pulsera');
      }

      // Recargar datos y cerrar modal
      loadFitbits();
      setIsModalOpen(false);
      setSelectedStatus('FREE');
    } catch {
      setError('Error al registrar la pulsera Fitbit');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = fitbits.filter((fitbit) =>
    fitbit.fitbit_code.toLowerCase().includes(query.toLowerCase()) ||
    fitbit.status.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="w-full text-slate-900 space-y-8 relative">
      {/* Cabecera de la sección */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-950">Fitbit</h1>
          <p className="mt-1 text-xs font-medium text-slate-500">Consulta el estado actual de los dispositivos</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="mt-4 sm:mt-0 inline-flex items-center justify-center px-5 py-3 bg-[#3A8FC2] hover:bg-[#27648A] text-white font-bold rounded-2xl shadow-lg shadow-blue-500/20 transition gap-2 cursor-pointer"
        >
          <span className="text-base font-extrabold leading-none">+</span>
          <span className="text-[12px]">Registrar Fitbit</span>
        </button>
      </div>

      {/* Tarjetas de resumen superior */}
      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { 
            label: 'En uso', 
            value: summary.in_use, 
            textColor: 'text-emerald-600', 
            backgroundColor: 'bg-[#E6FFEE]',
            borderColor: 'border-emerald-400', 
            hoverShadow: 'hover:shadow-[0_20px_25px_-5px_rgba(5,150,105,0.15)] hover:border-emerald-200' 
          },
          { 
            label: 'Libres', 
            value: summary.free, 
            textColor: 'text-blue-600',
            backgroundColor: 'bg-[#E6F5FF]', 
            borderColor: 'border-blue-400', 
            hoverShadow: 'hover:shadow-[0_20px_25px_-5px_rgba(37,99,235,0.15)] hover:border-blue-200' 
          },
          { 
            label: 'Mantenimiento', 
            value: summary.maintenance, 
            textColor: 'text-amber-600',
            backgroundColor: 'bg-[#FFF3E6]', 
            borderColor: 'border-amber-400', 
            hoverShadow: 'hover:shadow-[0_20px_25px_-5px_rgba(217,119,6,0.15)] hover:border-amber-200' 
          },
          { 
            label: 'Inactivas', 
            value: summary.inactive, 
            textColor: 'text-red-500', 
            backgroundColor: 'bg-[#FFE6E6]',
            borderColor: 'border-red-400', 
            hoverShadow: 'hover:shadow-[0_20px_25px_-5px_rgba(100,116,139,0.15)] hover:border-red-200' 
          },
        ].map((item) => (
          <div
            key={item.label}
            className={`rounded-2xl border ${item.backgroundColor} p-5 shadow-lg shadow-slate-100 transition-all duration-200 hover:-translate-y-1 text-center ${item.borderColor} ${item.hoverShadow}`}
          >
            <p className={`text-[11px] font-bold uppercase tracking-[0.25em] ${item.textColor}`}>
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

      {/* MODAL PARA REGISTRAR NUEVA FITBIT (Corregido con z-50 y posición fija absoluta al viewport) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-200/80 bg-white p-8 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-extrabold text-slate-900">Registrar nueva Fitbit</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateFitbit} className="space-y-4">
              {/* Código generado automáticamente */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Código de dispositivo (Automático)
                </label>
                <input
                  type="text"
                  value={nextCode}
                  disabled
                  className="w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-xs font-bold text-slate-600 cursor-not-allowed"
                />
              </div>

              {/* Desplegable de Estado */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Estado operativo
                </label>
                <div className="relative">
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3 pr-10 text-xs font-semibold text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 cursor-pointer"
                  >
                    <option value="FREE">Libre</option>
                    <option value="IN_USE">En uso</option>
                    <option value="MAINTENANCE">Mantenimiento</option>
                    <option value="INACTIVE">Inactiva</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-sm cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-2xl bg-blue-600 px-6 py-3 text-xs font-bold text-white hover:bg-blue-700 transition shadow-lg shadow-blue-500/20 disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'Registrando...' : 'Guardar pulsera'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Fitbits;