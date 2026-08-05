import React, { useEffect, useState } from 'react';

type PhysiologicalDataItem = {
  participant_code: string;
  fitbit_code: string;
  variable_type: string;
  physical_time: string;
  metric_value: number;
};

const API_BASE = 'http://localhost:1574';

const PhysiologicalData: React.FC = () => {
  const [participant, setParticipant] = useState('');
  const [fitbit, setFitbit] = useState('');
  const [variableType, setVariableType] = useState('');
  const [from, setFrom] = useState('2026-07-12');
  const [to, setTo] = useState('2026-07-26');

  const [data, setData] = useState<PhysiologicalDataItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [sortOrderDate, setSortOrderDate] = useState<'desc' | 'asc'>('desc');
  const [sortOrderValue, setSortOrderValue] = useState<'desc' | 'asc'>('desc');

  // Listas para los desplegables
  const [participantsList, setParticipantsList] = useState<string[]>([]);
  const [fitbitsList, setFitbitsList] = useState<string[]>([]);
  const [variablesList, setVariablesList] = useState<string[]>([]);

  useEffect(() => {
    fetch(`${API_BASE}/api/physiological-data/`, { credentials: 'include' })
      .then((res) => res.json())
      .then((result) => {
        const items = result.items || [];
        setParticipantsList(Array.from(new Set(items.map((i: PhysiologicalDataItem) => i.participant_code).filter(Boolean))) as string[]);
        setFitbitsList(Array.from(new Set(items.map((i: PhysiologicalDataItem) => i.fitbit_code).filter(Boolean))) as string[]);
        setVariablesList(Array.from(new Set(items.map((i: PhysiologicalDataItem) => i.variable_type).filter(Boolean))) as string[]);
      })
      .catch(() => { });
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
      })
      .catch(() => setError('No se encontraron datos fisiológicos'));
  };

  useEffect(() => {
    loadData();
  }, [participant, fitbit, variableType, from, to]);

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

  return (
    <div className="w-full text-slate-900 space-y-8">

      {/* Cabecera de la sección */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900">Datos fisiológicos</h1>
          <p className="mt-1 text-xs font-medium text-slate-500">Consulta y filtra las variables de monitorización continua</p>
        </div>
      </div>

      {/* FILTROS  */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-8 shadow-xl shadow-slate-200/40">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <button className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-sm">
              Exportar CSV
            </button>
            <button className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-sm">
              Exportar Excel
            </button>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-slate-100 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">

          {/* Participante */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Participante</label>
            <div className="relative">
              <select
                value={participant}
                onChange={(e) => setParticipant(e.target.value)}
                className="w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3 pr-10 text-xs font-semibold text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 cursor-pointer"
              >
                <option value="">Todos los participantes</option>
                {participantsList.map((code) => (
                  <option key={code} value={code}>{code}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>
          </div>

          {/* Fitbit */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Pulsera Fitbit</label>
            <div className="relative">
              <select
                value={fitbit}
                onChange={(e) => setFitbit(e.target.value)}
                className="w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3 pr-10 text-xs font-semibold text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 cursor-pointer"
              >
                <option value="">Todas las pulseras</option>
                {fitbitsList.map((code) => (
                  <option key={code} value={code}>{code}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>
          </div>

          {/* Variable */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Variable</label>
            <div className="relative">
              <select
                value={variableType}
                onChange={(e) => setVariableType(e.target.value)}
                className="w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3 pr-10 text-xs font-semibold text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 cursor-pointer"
              >
                <option value="">Todas las variables</option>
                {variablesList.map((variable) => (
                  <option key={variable} value={variable}>{variable}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>
          </div>

          {/* Desde */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Desde</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-xs text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
            />
          </div>

          {/* Hasta */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Hasta</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-xs text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
            />
          </div>
        </div>
      </div>

      {/* TABLA DE REGISTROS DETALLADOS */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xl shadow-slate-200/40">
        <div className="mb-6 flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-700">Registros detallados</p>
          <span className="inline-flex items-center px-3 py-1 rounded-xl text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
            {data.length} registros encontrados
          </span>
        </div>

        <div className="overflow-hidden rounded-2xl">
          <div className="overflow-x-auto">
            <table className="min-w-full table-fixed border-collapse text-left">
              <thead>
                <tr className="bg-blue-50/60 text-blue-900 uppercase text-[10px] tracking-wider">
                  <th className="w-[20%] px-6 py-3.5 font-bold rounded-l-2xl">PARTICIPANTE</th>
                  <th className="w-[20%] px-6 py-3.5 font-bold">PULSERA</th>
                  <th className="w-[20%] px-6 py-3.5 font-bold">VARIABLE</th>
                  <th className="w-[25%] px-6 py-3.5 font-bold cursor-pointer select-none hover:text-blue-600 transition" onClick={toggleSortOrderDate}>
                    <div className="flex items-center gap-1.5">
                      <span>HORA</span>
                      <svg className={`h-3.5 w-3.5 transition-transform ${sortOrderDate === 'asc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </th>
                  <th className="w-[25%] px-6 py-3.5 font-bold cursor-pointer select-none hover:text-blue-600 transition rounded-r-2xl" onClick={toggleSortOrderValue}>
                    <div className="flex items-center gap-1.5">
                      <span>VALOR</span>
                      <svg className={`h-3.5 w-3.5 transition-transform ${sortOrderValue === 'asc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.map((item, index) => (
                  <tr
                    key={`${item.participant_code}-${index}`}
                    className="border-b border-slate-200 last:border-b-0 hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="px-6 py-4 text-xs font-bold text-slate-900">{item.participant_code}</td>
                    <td className="px-6 py-4 text-xs font-semibold text-blue-600">{item.fitbit_code}</td>
                    <td className="px-6 py-4 text-xs">
                      <span className="inline-flex items-center px-3 py-1 rounded-xl text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-100">
                        {item.variable_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-600">{new Date(item.physical_time).toLocaleString('es-ES')}</td>
                    <td className="px-6 py-4 text-xs font-bold text-slate-900">{item.metric_value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {data.length === 0 && !error && (
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