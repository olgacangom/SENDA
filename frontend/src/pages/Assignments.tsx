import React, { useEffect, useState } from 'react';

const API_BASE = 'http://localhost:1574';

type AssignmentItem = {
  id?: string | number;
  participant?: { participant_code?: string } | string | null;
  participant_code?: string | null;
  fitbit?: { fitbit_code?: string } | string | null;
  fitbit_code?: string | null;
  start_date: string;
  estimated_end_date?: string | null;
  real_end_date?: string | null;
  status: string;
};

const Assignments: React.FC = () => {
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/assignments/`, { credentials: 'include' })
      .then(async (res) => {
        if (!res.ok) throw new Error(await res.text());
        return res.json();
      })
      .then((data) => {
        const list = Array.isArray(data) ? data : data.items || data.results || [];
        setAssignments(list);
      })
      .catch(() => setError('No se pudieron cargar las asignaciones'));
  }, []);

  const getParticipantCode = (item: AssignmentItem): string => {
    if (typeof item.participant === 'string') return item.participant;
    if (item.participant && typeof item.participant === 'object' && item.participant.participant_code) {
      return item.participant.participant_code;
    }
    if (item.participant_code) return item.participant_code;
    return 'N/A';
  };

  const getFitbitCode = (item: AssignmentItem): string => {
    if (typeof item.fitbit === 'string') return item.fitbit;
    if (item.fitbit && typeof item.fitbit === 'object' && item.fitbit.fitbit_code) {
      return item.fitbit.fitbit_code;
    }
    if (item.fitbit_code) return item.fitbit_code;
    return 'N/A';
  };

  const filtered = assignments.filter((item) => {
    const pCode = getParticipantCode(item).toLowerCase();
    const fCode = getFitbitCode(item).toLowerCase();
    const statusStr = item.status ? item.status.toLowerCase() : '';
    const searchLower = query.toLowerCase();

    return pCode.includes(searchLower) || fCode.includes(searchLower) || statusStr.includes(searchLower);
  });

  return (
    <div className="w-full text-slate-900">

      {/* Cabecera de la sección */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900">Asignaciones</h1>
          <p className="mt-1 text-xs font-medium text-slate-500">Gestión de pulseras asignadas a participantes en el estudio</p>
        </div>
        <button className="mt-4 sm:mt-0 inline-flex items-center justify-center px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-2xl shadow-lg shadow-blue-500/20 transition gap-2">
          <span>+ Nueva asignación</span>
        </button>
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
            placeholder="Buscar por código de participante, pulsera o estado..."
            className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 py-3.5 pl-11 pr-4 text-xs text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
          />
        </div>

        <div className="overflow-hidden rounded-2xl">
          <div className="overflow-x-auto">
            <table className="min-w-full table-fixed border-collapse text-left">
              <thead>
                <tr className="bg-blue-50/60 text-blue-900 uppercase text-[10px] tracking-wider">
                  <th className="w-[18%] px-6 py-4 font-bold rounded-l-2xl">PARTICIPANTE</th>
                  <th className="w-[18%] px-6 py-4 font-bold">PULSERA</th>
                  <th className="w-[18%] px-6 py-4 font-bold">FECHA INICIO</th>
                  <th className="w-[18%] px-6 py-4 font-bold">FECHA FIN ESTIMADA</th>
                  <th className="w-[18%] px-6 py-4 font-bold">FECHA FIN REAL</th>
                  <th className="w-[18%] px-6 py-4 font-bold rounded-r-2xl">ESTADO</th>
                </tr>
              </thead>

              <tbody>
                {filtered.map((item, index) => {
                  const pCode = getParticipantCode(item);
                  const fCode = getFitbitCode(item);

                  const isActive =
                    item.status?.toLowerCase().includes("active") ||
                    item.status?.toLowerCase().includes("en uso");

                  return (
                    <tr
                      key={item.id || index}
                      className="border-b border-slate-200 last:border-b-0 hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="px-6 py-5 text-xs font-bold text-slate-900">
                        {pCode}
                      </td>

                      <td className="px-6 py-5 text-xs font-semibold text-blue-600">
                        {fCode}
                      </td>

                      <td className="px-6 py-5 text-xs text-slate-600">
                        {item.start_date
                          ? new Date(item.start_date).toLocaleDateString("es-ES")
                          : "-"}
                      </td>

                      <td className="px-6 py-5 text-xs text-slate-600">
                        {item.estimated_end_date
                          ? new Date(item.estimated_end_date).toLocaleDateString("es-ES")
                          : "-"}
                      </td>

                      <td className="px-6 py-5 text-xs text-slate-600">
                        {item.real_end_date ? (
                          new Date(item.real_end_date).toLocaleDateString("es-ES")
                        ) : (
                          <span className="italic text-slate-400">En curso</span>
                        )}
                      </td>

                      <td className="px-6 py-5">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[11px] font-semibold ${isActive
                            ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                            : "border-slate-200 bg-slate-50 text-slate-700"
                            }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-emerald-500" : "bg-slate-400"
                              }`}
                          />
                          {item.status}
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
          <p className="py-8 text-center text-xs text-slate-400">No se encontraron asignaciones.</p>
        )}
        {error && (
          <p className="py-8 text-center text-xs text-red-500">{error}</p>
        )}
      </div>
    </div>
  );
};

export default Assignments;