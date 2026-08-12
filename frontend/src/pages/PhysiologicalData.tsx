import React, { useEffect, useState } from 'react';

type PhysiologicalDataItem = {
  participant_code: string;
  fitbit_code: string;
  variable_type: string;
  physical_time: string;
  metric_value: number;
};

const API_BASE = 'http://localhost:1574';

const VARIABLE_OPTIONS = [
  'SLEEP_DURATION', 'SLEEP_LIGHT', 'SLEEP_DEEP', 'SLEEP_REM',
  'SLEEP_AWAKE', 'SLEEP_START_END', 'HEART_RATE', 'HEART_RATE_RESTING',
  'HRV_NOCTURNAL', 'RESPIRATORY_RATE_NOCTURNAL', 'HR_ZONE_FAT_BURN',
  'HR_ZONE_CARDIO', 'HR_ZONE_PEAK', 'ACTIVE_ZONE_MINUTES', 'STEPS', 'DISTANCE'
];

const PhysiologicalData: React.FC = () => {
  const [participant, setParticipant] = useState('');
  const [fitbit, setFitbit] = useState('');
  const [variableType, setVariableType] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'COMPLETED'>('ALL');

  const [data, setData] = useState<PhysiologicalDataItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const [sortOrderDate, setSortOrderDate] = useState<'desc' | 'asc'>('desc');
  const [sortOrderValue, setSortOrderValue] = useState<'desc' | 'asc'>('desc');

  const [participantsList, setParticipantsList] = useState<string[]>([]);
  const [fitbitsList, setFitbitsList] = useState<string[]>([]);
  const [participantsStatusMap, setParticipantsStatusMap] = useState<Record<string, string>>({});

  useEffect(() => {
    Promise.all([
      fetch(`${API_BASE}/api/participants/`, { credentials: 'include' }).then(r => r.json()),
      fetch(`${API_BASE}/api/fitbits/list/`, { credentials: 'include' }).then(r => r.json()),
      fetch(`${API_BASE}/api/physiological-data/`, { credentials: 'include' }).then(r => r.json()),
      fetch(`${API_BASE}/api/assignments/`, { credentials: 'include' }).then(r => r.json())
    ])
      .then(([partData, fitData, physData, assignData]) => {
        const itemsPart = partData.items || [];
        setParticipantsList(itemsPart.map((p: any) => p.participant_code));
        setFitbitsList(fitData.items || []);

        const statusMap: Record<string, string> = {};
        const assignments = assignData.items || [];

        itemsPart.forEach((p: any) => {
          const assign = assignments.find((a: any) => a.participant_code === p.participant_code);

          if (!assign) {
            statusMap[p.participant_code] = 'PENDING';
          } else if (assign.real_end_date) {
            statusMap[p.participant_code] = 'COMPLETED';
          } else {
            // Si tiene asignación y no tiene real_end_date, está ACTIVO
            statusMap[p.participant_code] = 'ACTIVE';
          }
        });
        setParticipantsStatusMap(statusMap);
      })
      .catch((err) => console.error("Error cargando metadatos", err));
  }, []);

  const loadData = () => {
    setError(null);
    const params = new URLSearchParams();
    if (participant) params.append('participant', participant);
    if (fitbit) params.append('fitbit', fitbit);
    if (variableType) params.append('variable_type', variableType);
    if (from) params.append('from', from);
    if (to) params.append('to', to);

    fetch(`${API_BASE}/api/physiological-data/?${params.toString()}`, { credentials: 'include' })
      .then((res) => res.json())
      .then((result) => {
        setData(result.items || []);
        setCurrentPage(1);
      })
      .catch(() => setError('No se encontraron datos fisiológicos'));
  };

  useEffect(() => {
    loadData();
  }, [participant, fitbit, variableType, from, to]);

  const filteredDataByStatus = data.filter((item) => {
    const pStatus = participantsStatusMap[item.participant_code] || 'PENDING';

    // Ocultar cualquier dato de participantes en estado PENDING
    if (pStatus === 'PENDING') return false;

    if (statusFilter === 'ALL') return true;
    return pStatus === statusFilter;
  });

  const totalPages = Math.ceil(filteredDataByStatus.length / pageSize) || 1;
  const paginatedData = filteredDataByStatus.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const clearFilters = () => {
    setParticipant('');
    setFitbit('');
    setVariableType('');
    setFrom('');
    setTo('');
    setStatusFilter('ALL');
    setSortOrderDate('desc');
    setSortOrderValue('desc');
    setCurrentPage(1);
  };

  const handleExport = (format: 'csv' | 'xlsx') => {
    const params = new URLSearchParams();
    params.append('type', 'physiological');
    params.append('format', format);
    if (participant) params.append('participant', participant);
    if (fitbit) params.append('fitbit', fitbit);
    if (variableType) params.append('variable_type', variableType);
    if (from) params.append('from', from);
    if (to) params.append('to', to);
    if (statusFilter && statusFilter !== 'ALL') params.append('status', statusFilter);

    window.open(`${API_BASE}/api/export/?${params.toString()}`, '_blank');
  };

  const toggleSortOrderDate = () => {
    const newOrder = sortOrderDate === 'desc' ? 'asc' : 'desc';
    setSortOrderDate(newOrder);

    const sortedData = [...data].sort((a, b) => {
      const dateA = new Date(a.physical_time).getTime();
      const dateB = new Date(b.physical_time).getTime();
      return newOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });
    setData(sortedData);
  };

  const toggleSortOrderValue = () => {
    const newOrder = sortOrderValue === 'desc' ? 'asc' : 'desc';
    setSortOrderValue(newOrder);

    const sortedData = [...data].sort((a, b) => {
      return newOrder === 'desc' ? b.metric_value - a.metric_value : a.metric_value - b.metric_value;
    });
    setData(sortedData);
  };

  const goToPreviousPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };

  const goToNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  };

  return (
    <div className="w-full text-slate-900 space-y-8">
      {/* Cabecera de la sección */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900">Datos fisiológicos</h1>
          <p className="mt-1 text-xs font-medium text-slate-500">Consulta, filtra y analiza el histórico de monitorización</p>
        </div>
      </div>

      {/* Pestañas de estado */}
      <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-xl w-fit">
        <button
          onClick={() => { setStatusFilter('ALL'); setCurrentPage(1); }}
          className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${statusFilter === 'ALL' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
            }`}
        >
          Todos
        </button>
        <button
          onClick={() => { setStatusFilter('ACTIVE'); setCurrentPage(1); }}
          className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${statusFilter === 'ACTIVE' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
            }`}
        >
          Activos
        </button>
        <button
          onClick={() => { setStatusFilter('COMPLETED'); setCurrentPage(1); }}
          className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${statusFilter === 'COMPLETED' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
            }`}
        >
          Completados
        </button>
      </div>

      {/* FILTROS */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-8 shadow-xl shadow-slate-200/40">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center justify-between gap-3 w-full">
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => handleExport('csv')}
                className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-slate-700 hover:bg-emerald-100 transition shadow-sm cursor-pointer"
              >
                Exportar a CSV
              </button>
              <button
                onClick={() => handleExport('xlsx')}
                className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-slate-700 hover:bg-emerald-100 transition shadow-sm cursor-pointer"
              >
                Exportar a Excel
              </button>
            </div>
            <button
              onClick={clearFilters}
              className="ml-auto rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold text-rose-500 transition hover:bg-rose-500 hover:text-white cursor-pointer shadow-sm"
            >
              Limpiar filtros
            </button>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-slate-100 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {/* Participante */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Participante</label>
            <select
              value={participant}
              onChange={(e) => setParticipant(e.target.value)}
              className="w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3 pr-10 text-xs font-semibold text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white cursor-pointer"
            >
              <option value="">Todos los participantes</option>
              {participantsList.map((code) => (
                <option key={code} value={code}>{code}</option>
              ))}
            </select>
          </div>

          {/* Fitbit */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Pulsera Fitbit</label>
            <select
              value={fitbit}
              onChange={(e) => setFitbit(e.target.value)}
              className="w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3 pr-10 text-xs font-semibold text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white cursor-pointer"
            >
              <option value="">Todas las pulseras</option>
              {fitbitsList.map((code) => (
                <option key={code} value={code}>{code}</option>
              ))}
            </select>
          </div>

          {/* Variable */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Variable</label>
            <select
              value={variableType}
              onChange={(e) => setVariableType(e.target.value)}
              className="w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3 pr-10 text-xs font-semibold text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white cursor-pointer"
            >
              <option value="">Todas las variables</option>
              {VARIABLE_OPTIONS.map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>

          {/* Desde */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Desde</label>
            <input
              type="datetime-local"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-xs text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white"
            />
          </div>

          {/* Hasta */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Hasta</label>
            <input
              type="datetime-local"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-xs text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white"
            />
          </div>
        </div>
      </div>

      {/* Tabla de registros */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xl shadow-slate-200/40">
        <div className="mb-6 flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-700">Registros detallados</p>
          <span className="inline-flex items-center px-3 py-1 rounded-xl text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
            Mostrando {paginatedData.length} de {filteredDataByStatus.length} registros filtrados
          </span>
        </div>

        <div className="overflow-hidden rounded-2xl">
          <div className="overflow-x-auto">
            <table className="min-w-full table-fixed border-collapse text-left">
              <thead>
                <tr className="bg-blue-50/60 text-blue-900 uppercase text-[10px] tracking-wider">
                  <th className="w-[18%] px-6 py-3.5 font-bold rounded-l-2xl">PARTICIPANTE</th>
                  <th className="w-[17%] px-6 py-3.5 font-bold">ESTADO</th>
                  <th className="w-[18%] px-6 py-3.5 font-bold">PULSERA</th>
                  <th className="w-[18%] px-6 py-3.5 font-bold">VARIABLE</th>
                  <th className="w-[15%] px-6 py-3.5 font-bold cursor-pointer select-none hover:text-blue-600 transition" onClick={toggleSortOrderDate}>
                    <div className="flex items-center gap-1.5">
                      <span>HORA</span>
                    </div>
                  </th>
                  <th className="w-[14%] px-6 py-3.5 font-bold cursor-pointer select-none hover:text-blue-600 transition rounded-r-2xl" onClick={toggleSortOrderValue}>
                    <div className="flex items-center gap-1.5">
                      <span>VALOR</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((item, index) => {
                  const status = participantsStatusMap[item.participant_code] || 'ACTIVE';
                  return (
                    <tr key={`${item.participant_code}-${index}`} className="border-b border-slate-200 last:border-b-0 hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4 text-xs font-bold text-slate-900">{item.participant_code}</td>
                      <td className="px-6 py-4 text-xs">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-xl text-[10px] font-bold ${status === 'COMPLETED' ? 'bg-amber-50 text-amber-700 border border-amber-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                          }`}>
                          {status === 'COMPLETED' ? 'Completado' : 'Activo'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs font-semibold text-blue-600">{item.fitbit_code}</td>
                      <td className="px-6 py-4 text-xs">
                        <span className="inline-flex items-center px-3 py-1 rounded-xl text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-100">
                          {item.variable_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-600">{new Date(item.physical_time).toLocaleString('es-ES')}</td>
                      <td className="px-6 py-4 text-xs font-bold text-slate-900">{item.metric_value}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/*  Paginación */}
        {filteredDataByStatus.length > 0 && (
          <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[11px] font-medium text-slate-400">
              Página {currentPage} de {totalPages}
            </p>

            <div className="flex items-center gap-2">
              <button
                onClick={goToPreviousPage}
                disabled={currentPage === 1}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
              >
                ← Anterior
              </button>

              <div className="rounded-xl bg-blue-50 px-4 py-2 text-[11px] font-bold text-blue-700">
                {currentPage}
              </div>

              <button
                onClick={goToNextPage}
                disabled={currentPage === totalPages}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
              >
                Siguiente →
              </button>
            </div>
          </div>
        )}

        {filteredDataByStatus.length === 0 && !error && (
          <p className="py-12 text-center text-xs text-slate-400">No se encontraron datos para los filtros seleccionados.</p>
        )}
        {error && (
          <p className="py-12 text-center text-xs text-red-500">{error}</p>
        )}
      </div>
    </div>
  );
};

export default PhysiologicalData;